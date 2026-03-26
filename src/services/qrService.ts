import { supabase } from '@/integrations/supabase/client';
import { detectQRType } from '@/utils/qrGenerator';

export const saveScannedQR = async (data: {
  fileName: string;
  qrData: string;
  isUrl: boolean;
  previewImage?: string;
  notes?: string;
  tags?: string[];
}) => {
  const qrType = detectQRType(data.qrData);
  const { data: result, error } = await supabase
    .from('qr_scans' as any)
    .insert({
      file_name: data.fileName,
      qr_data: data.qrData,
      qr_type: qrType,
      is_url: data.isUrl,
      preview_image: data.previewImage,
      notes: data.notes,
      tags: data.tags || []
    })
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const saveGeneratedQR = async (data: {
  content: string;
  qrImageUrl: string;
  title?: string;
  notes?: string;
  tags?: string[];
  batchId?: string;
  batchName?: string;
  gymId?: string;
  destinationType?: string;
}) => {
  const qrType = detectQRType(data.content);
  const { data: result, error } = await supabase
    .from('qr_generated' as any)
    .insert({
      content: data.content,
      qr_type: qrType,
      qr_image_url: data.qrImageUrl,
      title: data.title,
      notes: data.notes,
      tags: data.tags || [],
      batch_id: data.batchId,
      batch_name: data.batchName,
      gym_id: data.gymId,
      destination_type: data.destinationType,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const saveBulkGeneratedQRs = async (data: {
  batchName: string;
  qrCodes: Array<{
    content: string;
    qrImageUrl: string;
    title?: string;
    gymId?: string;
    destinationType?: string;
  }>;
}) => {
  const batchId = crypto.randomUUID();
  const insertData = data.qrCodes.map(qr => ({
    content: qr.content,
    qr_type: detectQRType(qr.content),
    qr_image_url: qr.qrImageUrl,
    title: qr.title,
    batch_id: batchId,
    batch_name: data.batchName,
    gym_id: qr.gymId,
    destination_type: qr.destinationType,
    tags: [],
  }));
  const { data: result, error } = await supabase
    .from('qr_generated' as any)
    .insert(insertData)
    .select();
  if (error) throw error;
  return result;
};

export const getScannedQRHistory = async () => {
  const { data, error } = await supabase
    .from('qr_scans' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getGeneratedQRHistory = async () => {
  const { data, error } = await supabase
    .from('qr_generated' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const deleteQRScan = async (id: string) => {
  const { error } = await supabase.from('qr_scans' as any).delete().eq('id', id);
  if (error) throw error;
};

export const deleteGeneratedQR = async (id: string) => {
  const { error } = await supabase.from('qr_generated' as any).delete().eq('id', id);
  if (error) throw error;
};

export const deleteBatch = async (batchId: string) => {
  const { error } = await supabase.from('qr_generated' as any).delete().eq('batch_id', batchId);
  if (error) throw error;
};
