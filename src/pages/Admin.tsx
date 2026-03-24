import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGyms, useUpdateGymInfo } from "@/hooks/useGyms";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Users, Building2, Database, Shield, Pencil, Check, X,
  MapPin, Phone, Mail, Globe, ExternalLink, PlusCircle, Trash2, Search, Sparkles
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AddGymModal } from "@/components/AddGymModal";

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const { data: gyms = [], isLoading } = useGyms();
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateGymInfoMutation = useUpdateGymInfo();

  const [activeTab, setActiveTab] = useState<'gyms' | 'users' | 'bulk'>('gyms');
  const [editingCell, setEditingCell] = useState<{ gymId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // User management state
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; role: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-text-primary))' }}>Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this area.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const startEdit = (gymId: string, field: string, currentValue: string) => {
    setEditingCell({ gymId, field });
    setEditValue(currentValue || '');
  };

  const saveEdit = () => {
    if (!editingCell) return;
    updateGymInfoMutation.mutate(
      { gymId: editingCell.gymId, updates: { [editingCell.field]: editValue || null } },
      {
        onSuccess: () => {
          toast({ description: 'Updated successfully!' });
          setEditingCell(null);
        },
        onError: () => {
          toast({ variant: 'destructive', description: 'Failed to update' });
        }
      }
    );
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const loadAdminUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email');

      const users = (roles || []).map(r => {
        const profile = profiles?.find(p => p.id === r.user_id);
        return { id: r.user_id, email: profile?.email || 'Unknown', role: r.role };
      });
      setAdminUsers(users);
    } catch {
      toast({ variant: 'destructive', description: 'Failed to load users' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredGyms = searchQuery
    ? gyms.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.code.toLowerCase().includes(searchQuery.toLowerCase()))
    : gyms;

  const tabs = [
    { id: 'gyms' as const, label: 'Manage Gyms', icon: Building2 },
    { id: 'users' as const, label: 'Users & Roles', icon: Users },
    { id: 'bulk' as const, label: 'Bulk Data', icon: Database },
  ];

  const renderCell = (gymId: string, field: string, value: string | null | undefined, isLink = false) => {
    const isEditing = editingCell?.gymId === gymId && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}>
            <Check className="w-3 h-3 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
            <X className="w-3 h-3 text-red-500" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 group cursor-pointer" onClick={() => startEdit(gymId, field, value || '')}>
        <span className={`text-xs truncate max-w-[180px] ${value ? '' : 'text-muted-foreground italic'}`}>
          {value || 'Not set'}
        </span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  };

  const copyAllGymData = () => {
    let text = 'GYM DATABASE EXPORT\n\n';
    gyms.forEach(g => {
      text += `${g.name} (${g.code})\n`;
      text += `  Address: ${g.address || '-'}\n`;
      text += `  Phone: ${g.phone || '-'}\n`;
      text += `  Email: ${g.email || '-'}\n`;
      text += `  Website: ${g.website || '-'}\n`;
      text += `  Colors: ${g.colors.map(c => c.color_hex).join(', ')}\n\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      toast({ description: 'All gym data copied!' });
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #e5e7eb 0%, #d6c5bf 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-sm px-4 py-3 flex items-center justify-between" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'hsl(var(--brand-rose-gold))' }}>
              <Shield className="w-5 h-5" /> Admin Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/my-brand')}
            className="border-[#b48f8f]/40 text-[#b48f8f] hover:bg-[#b48f8f]/10"
          >
            <Sparkles className="w-4 h-4 mr-1" /> My Brand
          </Button>
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'users') loadAdminUsers();
              }}
              style={activeTab === tab.id ? { background: 'hsl(var(--brand-rose-gold))', color: 'white' } : {}}
            >
              <tab.icon className="w-4 h-4 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-[1600px] mx-auto">
        {/* Manage Gyms Tab */}
        {activeTab === 'gyms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search gyms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-60"
                  />
                </div>
                <span className="text-sm text-muted-foreground">{filteredGyms.length} gyms</span>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                style={{ background: 'hsl(var(--brand-rose-gold))', color: 'white' }}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Add Gym
              </Button>
            </div>

            {/* Gym Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ background: 'hsl(var(--brand-rose-gold) / 0.08)' }}>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Gym</th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Code</th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">
                          <MapPin className="w-3 h-3 inline mr-1" />Address
                        </th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">
                          <Phone className="w-3 h-3 inline mr-1" />Phone
                        </th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">
                          <Mail className="w-3 h-3 inline mr-1" />Email
                        </th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">
                          <Globe className="w-3 h-3 inline mr-1" />Website
                        </th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Colors</th>
                        <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGyms.map((gym, i) => {
                        const mainLogo = gym.logos.find(l => l.is_main_logo);
                        return (
                          <tr key={gym.id} className={`border-b hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {mainLogo ? (
                                  <img src={mainLogo.file_url} alt={gym.name} className="w-8 h-8 object-contain rounded bg-white border" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">{gym.code}</div>
                                )}
                                <span className="font-medium text-xs">{gym.name}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)' }}>
                                {gym.code}
                              </span>
                            </td>
                            <td className="p-3">{renderCell(gym.id, 'address', gym.address)}</td>
                            <td className="p-3">{renderCell(gym.id, 'phone', gym.phone)}</td>
                            <td className="p-3">{renderCell(gym.id, 'email', gym.email)}</td>
                            <td className="p-3">{renderCell(gym.id, 'website', gym.website)}</td>
                            <td className="p-3">
                              <div className="flex gap-0.5">
                                {gym.colors.slice(0, 5).map(c => (
                                  <div
                                    key={c.id}
                                    className="w-4 h-4 rounded-sm border border-white/50"
                                    style={{ background: c.color_hex }}
                                    title={c.color_hex}
                                  />
                                ))}
                                {gym.colors.length > 5 && (
                                  <span className="text-xs text-muted-foreground ml-1">+{gym.colors.length - 5}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => navigate(`/gym/${gym.code}`)}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" /> Profile
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users & Roles Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                  Admin Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : adminUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users with roles found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold text-xs uppercase">Email</th>
                        <th className="text-left p-2 font-semibold text-xs uppercase">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} className="border-b">
                          <td className="p-2 text-xs">{u.email}</td>
                          <td className="p-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-rose-gold))' }}>
                              {u.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Data Tab */}
        {activeTab === 'bulk' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                  Bulk Data Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={copyAllGymData}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <Database className="w-6 h-6" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                    <span className="text-sm font-medium">Export All Gym Data</span>
                    <span className="text-xs text-muted-foreground">Copy names, contacts, colors</span>
                  </Button>

                  <Button
                    onClick={() => {
                      const csv = ['Name,Code,Address,Phone,Email,Website,Colors']
                        .concat(gyms.map(g => 
                          `"${g.name}","${g.code}","${g.address || ''}","${g.phone || ''}","${g.email || ''}","${g.website || ''}","${g.colors.map(c => c.color_hex).join(';')}"`
                        )).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'gyms-export.csv'; a.click();
                      URL.revokeObjectURL(url);
                      toast({ description: 'CSV downloaded!' });
                    }}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <Database className="w-6 h-6" style={{ color: 'hsl(var(--brand-blue-gray))' }} />
                    <span className="text-sm font-medium">Download CSV</span>
                    <span className="text-xs text-muted-foreground">Full gym database as CSV</span>
                  </Button>

                  <Button
                    onClick={() => {
                      let text = '';
                      gyms.forEach(g => {
                        text += g.colors.map(c => c.color_hex).join('\n') + '\n';
                      });
                      navigator.clipboard.writeText(text.trim());
                      toast({ description: 'All colors copied (hex only)!' });
                    }}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <Database className="w-6 h-6" style={{ color: 'hsl(var(--brand-navy))' }} />
                    <span className="text-sm font-medium">Copy All Colors (Hex)</span>
                    <span className="text-xs text-muted-foreground">Every color, no labels</span>
                  </Button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  <div className="p-3 rounded-lg border text-center" style={{ background: 'hsl(var(--brand-rose-gold) / 0.05)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-rose-gold))' }}>{gyms.length}</div>
                    <div className="text-xs text-muted-foreground">Total Gyms</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center" style={{ background: 'hsl(var(--brand-blue-gray) / 0.05)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-blue-gray))' }}>
                      {gyms.reduce((sum, g) => sum + g.colors.length, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Colors</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <div className="text-2xl font-bold" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                      {gyms.reduce((sum, g) => sum + g.logos.length, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Logos</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {gyms.filter(g => g.address && g.phone && g.email).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Complete Profiles</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AddGymModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default Admin;
