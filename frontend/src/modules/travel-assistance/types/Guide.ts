export type GuideBlock = {
  type: "heading" | "paragraph" | "image" | "audio" | "video";
  text?: string;
  url?: string;
};

export type Guide = {
  id: string;
  user_id: string;
  title: string;
  content: GuideBlock[];
  published: boolean;
  created_at: string;
  updated_at?: string;
  level: string;
  category: string;
};

export type CreateGuideDTO = {
  title: string;
  content: GuideBlock[];
  published: boolean;
  level: string;
  category: string;
};

export type UpdateGuideDTO = {
  title: string;
  content: GuideBlock[];
  published: boolean;
  level: string;
  category: string;
};