-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create userStats table
CREATE TABLE IF NOT EXISTS public."userStats" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "bestScore" INTEGER DEFAULT 0,
  "lastUpdated" BIGINT NOT NULL,
  "styleStreak" INTEGER DEFAULT 0,
  "averageScore" INTEGER DEFAULT 0,
  "dominantStyle" TEXT,
  "weeklyOutfitCount" INTEGER DEFAULT 0,
  "lastEvaluationDate" TEXT,
  "styleJourneyInsight" TEXT,
  "styleArchetype" TEXT,
  lifestyle TEXT,
  goals TEXT,
  "outfitRatings" TEXT,
  "completedAt" BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evaluations table
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  "imageUri" TEXT NOT NULL,
  occasion TEXT,
  "createdAt" BIGINT NOT NULL,
  "styleArchetype" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wardrobeItems table
CREATE TABLE IF NOT EXISTS public."wardrobeItems" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tags TEXT,
  color TEXT,
  season TEXT,
  category TEXT NOT NULL,
  "imageUri" TEXT NOT NULL,
  "lastWorn" BIGINT,
  "createdAt" BIGINT NOT NULL,
  "wearCount" INTEGER DEFAULT 0,
  "averageScore" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outfitCombinations table
CREATE TABLE IF NOT EXISTS public."outfitCombinations" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "itemIds" TEXT NOT NULL,
  "lastWorn" BIGINT,
  "createdAt" BIGINT NOT NULL,
  "wearCount" INTEGER DEFAULT 0,
  "averageScore" INTEGER DEFAULT 0,
  "aiEvaluation" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notificationSettings table
CREATE TABLE IF NOT EXISTS public."notificationSettings" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "weeklyReports" BOOLEAN DEFAULT true,
  "styleEncouragement" BOOLEAN DEFAULT true,
  "lastWeeklyReportSent" BIGINT,
  "lastEncouragementSent" BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public."userStats"(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON public.evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON public.evaluations("createdAt");
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id ON public."wardrobeItems"(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category ON public."wardrobeItems"(category);
CREATE INDEX IF NOT EXISTS idx_outfit_combinations_user_id ON public."outfitCombinations"(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public."notificationSettings"(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public."userStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."wardrobeItems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."outfitCombinations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notificationSettings" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for userStats
CREATE POLICY "Users can view their own stats"
  ON public."userStats" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public."userStats" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public."userStats" FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stats"
  ON public."userStats" FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for evaluations
CREATE POLICY "Users can view their own evaluations"
  ON public.evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations"
  ON public.evaluations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluations"
  ON public.evaluations FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for wardrobeItems
CREATE POLICY "Users can view their own wardrobe items"
  ON public."wardrobeItems" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wardrobe items"
  ON public."wardrobeItems" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wardrobe items"
  ON public."wardrobeItems" FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wardrobe items"
  ON public."wardrobeItems" FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for outfitCombinations
CREATE POLICY "Users can view their own outfit combinations"
  ON public."outfitCombinations" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfit combinations"
  ON public."outfitCombinations" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfit combinations"
  ON public."outfitCombinations" FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfit combinations"
  ON public."outfitCombinations" FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for notificationSettings
CREATE POLICY "Users can view their own notification settings"
  ON public."notificationSettings" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public."notificationSettings" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public."notificationSettings" FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings"
  ON public."notificationSettings" FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public."userStats"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wardrobe_items_updated_at BEFORE UPDATE ON public."wardrobeItems"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outfit_combinations_updated_at BEFORE UPDATE ON public."outfitCombinations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public."notificationSettings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();