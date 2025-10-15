import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Gym {
  id: string;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
}

export interface GymColor {
  id: string;
  gym_id: string;
  color_hex: string;
  order_index: number;
  created_at?: string;
}

export interface GymLogo {
  id: string;
  gym_id: string;
  filename: string;
  file_url: string;
  is_main_logo: boolean;
  created_at?: string;
}

export interface GymElement {
  id: string;
  gym_id: string;
  element_type: string;
  svg_data: string;
  element_color: string;
  element_variant?: number;
  created_at?: string;
}

export interface GymWithColors extends Gym {
  colors: GymColor[];
  logos: GymLogo[];
  elements: GymElement[];
}

export const useGyms = () => {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: async (): Promise<GymWithColors[]> => {
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .order('code');

      if (gymsError) throw gymsError;

      const { data: colors, error: colorsError } = await supabase
        .from('gym_colors')
        .select('*')
        .order('order_index');

      if (colorsError) throw colorsError;

      const { data: logos, error: logosError } = await supabase
        .from('gym_logos')
        .select('*')
        .order('created_at');

      if (logosError) throw logosError;

      const { data: elements, error: elementsError } = await supabase
        .from('gym_elements')
        .select('*')
        .order('created_at');

      if (elementsError) throw elementsError;

      return gyms.map(gym => ({
        ...gym,
        colors: colors.filter(color => color.gym_id === gym.id),
        logos: logos.filter(logo => logo.gym_id === gym.id),
        elements: elements?.filter(element => element.gym_id === gym.id) || [],
      }));
    },
  });
};

export const useAddGym = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, code, colors }: { name: string; code: string; colors: string[] }) => {
      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .insert({ name, code })
        .select()
        .single();

      if (gymError) throw gymError;

      if (colors.length > 0) {
        const colorInserts = colors.map((color, index) => ({
          gym_id: gym.id,
          color_hex: color,
          order_index: index,
        }));

        const { error: colorsError } = await supabase
          .from('gym_colors')
          .insert(colorInserts);

        if (colorsError) throw colorsError;
      }

      return gym;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
};

export const useUpdateGymColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ colorId, newColor }: { colorId: string; newColor: string }) => {
      const { error } = await supabase
        .from('gym_colors')
        .update({ color_hex: newColor })
        .eq('id', colorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gymId, file, isMain = false }: { gymId: string; file: File; isMain?: boolean }) => {
      console.log('Starting logo upload for gym:', gymId, 'file:', file.name);
      
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${gymId}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log('Uploading to storage with path:', filePath);
        const { error: uploadError } = await supabase.storage
          .from('gym-logos')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded successfully, getting public URL');
        const { data: { publicUrl } } = supabase.storage
          .from('gym-logos')
          .getPublicUrl(filePath);

        console.log('Public URL:', publicUrl);

        if (isMain) {
          console.log('Setting other logos as non-main');
          const { error: updateError } = await supabase
            .from('gym_logos')
            .update({ is_main_logo: false })
            .eq('gym_id', gymId);
          
          if (updateError) {
            console.error('Error updating main logo flags:', updateError);
            throw updateError;
          }
        }

        console.log('Inserting logo record into database');
        const { data: logo, error: logoError } = await supabase
          .from('gym_logos')
          .insert({
            gym_id: gymId,
            filename: file.name,
            file_url: publicUrl,
            is_main_logo: isMain,
          })
          .select()
          .single();

        if (logoError) {
          console.error('Database insert error:', logoError);
          throw logoError;
        }

        console.log('Logo upload completed successfully:', logo);
        return logo;
      } catch (error) {
        console.error('Logo upload failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Upload successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
    },
  });
};

export const useSetMainLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gymId, logoId }: { gymId: string; logoId: string }) => {
      await supabase
        .from('gym_logos')
        .update({ is_main_logo: false })
        .eq('gym_id', gymId);

      const { error } = await supabase
        .from('gym_logos')
        .update({ is_main_logo: true })
        .eq('id', logoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
};

export const useDeleteLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logoId: string) => {
      const { data: logo, error: fetchError } = await supabase
        .from('gym_logos')
        .select('file_url')
        .eq('id', logoId)
        .single();

      if (fetchError) throw fetchError;

      const fileName = logo.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('gym-logos')
          .remove([fileName]);
      }

      const { error } = await supabase
        .from('gym_logos')
        .delete()
        .eq('id', logoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
};

export const useUploadElement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      gymId, 
      file, 
      elementType 
    }: { 
      gymId: string; 
      file: File; 
      elementType: string;
    }) => {
      console.log('Starting element upload for gym:', gymId, 'file:', file.name, 'type:', elementType);
      
      try {
        // Read file content as text if it's SVG
        let svgData = '';
        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
          svgData = await file.text();
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${gymId}-${elementType}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log('Uploading to storage with path:', filePath);
        const { error: uploadError } = await supabase.storage
          .from('gym-logos')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded successfully, getting public URL');
        const { data: { publicUrl } } = supabase.storage
          .from('gym-logos')
          .getPublicUrl(filePath);

        console.log('Public URL:', publicUrl);
        console.log('Inserting element record into database');
        
        const { data: element, error: elementError } = await supabase
          .from('gym_elements')
          .insert({
            gym_id: gymId,
            element_type: elementType,
            svg_data: svgData || publicUrl,
            element_color: '#000000',
            element_variant: 1,
          })
          .select()
          .single();

        if (elementError) {
          console.error('Database insert error:', elementError);
          throw elementError;
        }

        console.log('Element upload completed successfully:', element);
        return element;
      } catch (error) {
        console.error('Element upload failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Upload successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
    },
  });
};

export const useDeleteElement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (elementId: string) => {
      const { error } = await supabase
        .from('gym_elements')
        .delete()
        .eq('id', elementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
};

export const useUpdateElementType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ elementId, elementType }: { elementId: string; elementType: string }) => {
      const { error } = await supabase
        .from('gym_elements')
        .update({ element_type: elementType })
        .eq('id', elementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
};