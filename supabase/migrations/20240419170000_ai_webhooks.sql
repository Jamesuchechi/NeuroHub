-- Enable naming of secrets without using GUC parameters which have permission issues
CREATE TABLE IF NOT EXISTS public.app_secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Secure the secrets table: No one can read it directly via API
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Trigger function to notify SvelteKit of new content needing embeddings
CREATE OR REPLACE FUNCTION notify_ai_background_embed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
BEGIN
  -- Fetch from our new secrets table
  SELECT value INTO webhook_url FROM public.app_secrets WHERE key = 'ai_webhook_url';
  SELECT value INTO webhook_secret FROM public.app_secrets WHERE key = 'ai_webhook_secret';

  -- Defaults for local development if not set in DB
  webhook_url := coalesce(webhook_url, 'http://localhost:5173/api/ai/background-embed');
  webhook_secret := coalesce(webhook_secret, 'local-secret-123');

  PERFORM
    net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || webhook_secret
      ),
      body := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW),
        'type', TG_OP
      )
    );
  RETURN NEW;
END;
$$;

-- Triggers (same as before)
DROP TRIGGER IF EXISTS on_message_created_embed ON messages;
CREATE TRIGGER on_message_created_embed
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_ai_background_embed();

DROP TRIGGER IF EXISTS on_note_created_embed ON notes;
CREATE TRIGGER on_note_created_embed
AFTER INSERT OR UPDATE OF title, content ON notes
FOR EACH ROW
EXECUTE FUNCTION notify_ai_background_embed();

DROP TRIGGER IF EXISTS on_snippet_created_embed ON snippets;
CREATE TRIGGER on_snippet_created_embed
AFTER INSERT OR UPDATE OF title, code, language ON snippets
FOR EACH ROW
EXECUTE FUNCTION notify_ai_background_embed();
