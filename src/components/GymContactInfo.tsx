import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Mail, Globe, Edit3, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GymContactInfoProps {
  gymId: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  primaryColor: string;
  isAdmin: boolean;
}

export const GymContactInfo = ({ gymId, address, phone, email, website, primaryColor, isAdmin }: GymContactInfoProps) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ address: address || '', phone: phone || '', email: email || '', website: website || '' });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const hasInfo = address || phone || email || website;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('gyms').update({
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
    }).eq('id', gymId);

    if (error) {
      toast({ variant: "destructive", description: "Failed to update contact info" });
    } else {
      toast({ description: "Contact info updated!" });
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      setEditing(false);
    }
    setSaving(false);
  };

  const fields = [
    { icon: MapPin, label: "Address", key: "address" as const, value: address, href: address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : undefined },
    { icon: Phone, label: "Phone", key: "phone" as const, value: phone, href: phone ? `tel:${phone}` : undefined },
    { icon: Mail, label: "Email", key: "email" as const, value: email, href: email ? `mailto:${email}` : undefined },
    { icon: Globe, label: "Website", key: "website" as const, value: website, href: website ? (website.startsWith('http') ? website : `https://${website}`) : undefined },
  ];

  return (
    <Card className="bg-white/50 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-xl">
          <span>📍 Contact & Location</span>
          {isAdmin && (
            <Button
              onClick={() => editing ? handleSave() : setEditing(true)}
              size="sm"
              disabled={saving}
              className="text-white font-semibold shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {editing ? (
                <><Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save"}</>
              ) : (
                <><Edit3 className="w-4 h-4 mr-2" />Edit</>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {fields.map(({ icon: Icon, label, key }) => (
              <div key={key} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder={label}
                  value={form[key]}
                  onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="bg-white/80"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="mt-2">
              <X className="w-4 h-4 mr-2" />Cancel
            </Button>
          </div>
        ) : hasInfo ? (
          <div className="space-y-3">
            {fields.map(({ icon: Icon, label, value, href }) => value && (
              <div key={label} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: `${primaryColor}15` }}>
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: primaryColor }}>
                    {value}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-foreground">{value}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {isAdmin ? "Click Edit to add contact information" : "No contact information available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
