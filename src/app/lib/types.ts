// Types matching the FastAPI backend response models exactly

export interface Source {
  title: string;
  url?: string | null;
  category?: string | null;
  price?: string | null;
  gap_solved?: string | null;
  location?: string | null;
  type?: string | null;
}

export interface Message {
  text: string;
  sender: 'user' | 'meo';
  sources?: Source[];
  mode?: string;
}