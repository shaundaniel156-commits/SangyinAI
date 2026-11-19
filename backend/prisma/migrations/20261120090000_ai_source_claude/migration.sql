-- Claude is the backup AI: a draft or plan it wrote is recorded as "claude", not "gemini".
ALTER TYPE "AiSource" ADD VALUE IF NOT EXISTS 'claude' BEFORE 'offline';
