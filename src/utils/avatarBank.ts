export interface AvatarStyleOption {
  id: string;
  label: string;
  description: string;
}

export const AVATAR_STYLES: AvatarStyleOption[] = [
  {
    id: 'notionists',
    label: 'Notionists (Padrão)',
    description: 'Ilustrações minimalistas estilo Notion',
  },
  {
    id: 'adventurer',
    label: 'Adventurer',
    description: 'Personagens ilustrados estilizados',
  },
  {
    id: 'lorelei',
    label: 'Lorelei',
    description: 'Traços artísticos modernos',
  },
  {
    id: 'bottts',
    label: 'Dev Bots',
    description: 'Robôs geeks e divertidos',
  },
  {
    id: 'pixel-art',
    label: 'Pixel Art 8-Bit',
    description: 'Visual retrô gamer / dev',
  },
];

export const AVATAR_BG_COLORS = [
  { hex: '059669', label: 'Esmeralda' },
  { hex: '0284c7', label: 'Azul Céu' },
  { hex: '7c3aed', label: 'Violeta' },
  { hex: 'db2777', label: 'Pink' },
  { hex: 'd97706', label: 'Âmbar' },
  { hex: '2563eb', label: 'Royal' },
  { hex: 'dc2626', label: 'Coral' },
  { hex: '334155', label: 'Slate' },
];

export const PRESET_SEEDS = [
  'DevAlpha',
  'CodeNinja',
  'CyberWizard',
  'FullstackHero',
  'BugHunter',
  'CloudArchitect',
  'VibeCoder',
  'RocketBuilder',
  'PixelMaster',
  'DataAlchemist',
  'PromptEngineer',
  'OpenSourcePro',
];

export function buildDiceBearUrl(
  style: string,
  seed: string,
  bgColor = '059669'
): string {
  return `https://api.dicebear.com/9.x/${encodeURIComponent(
    style
  )}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${encodeURIComponent(
    bgColor
  )}`;
}

/**
 * Recorta para 256px e envia WebP compacto. A API pública devolve uma URL da imagem.
 */
export function processUploadedAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      reject(new Error('Selecione PNG, JPG ou WebP de até 5 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erro ao processar imagem.'));
          return;
        }

        // Center crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const result = canvas.toDataURL('image/webp', 0.8);
        if (result.length > 65560) reject(new Error('A foto ficou muito grande. Escolha outra imagem.'));
        else resolve(result);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

