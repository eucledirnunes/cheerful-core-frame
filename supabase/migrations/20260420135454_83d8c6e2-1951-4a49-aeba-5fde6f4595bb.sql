
-- ============================================================
-- Cleanup: merge the 3 duplicated Cledir contacts into one
-- correct contact (final 1268), and delete the wrong ones.
-- ============================================================

-- 1. Move all conversations from the wrong contacts to the correct one
UPDATE public.conversations
SET contact_id = '18affde4-a6f7-4cf0-9822-4967798c1c76'
WHERE contact_id IN (
  'adf94abc-1c93-4571-93f1-0bb6aa43a127',  -- LID-only contact
  '565695ac-31d9-4c3e-9bea-111b01bb8a8b'   -- Daniel Selbach (wrong resolution)
);

-- 2. Move any deals from the wrong contacts to the correct one
UPDATE public.deals
SET contact_id = '18affde4-a6f7-4cf0-9822-4967798c1c76'
WHERE contact_id IN (
  'adf94abc-1c93-4571-93f1-0bb6aa43a127',
  '565695ac-31d9-4c3e-9bea-111b01bb8a8b'
);

-- 3. Move any appointments
UPDATE public.appointments
SET contact_id = '18affde4-a6f7-4cf0-9822-4967798c1c76'
WHERE contact_id IN (
  'adf94abc-1c93-4571-93f1-0bb6aa43a127',
  '565695ac-31d9-4c3e-9bea-111b01bb8a8b'
);

-- 4. Update the correct contact with name + whatsapp_id + LID alias cache
UPDATE public.contacts
SET
  name = 'Cledir',
  call_name = 'Cledir',
  whatsapp_id = '554896911268@s.whatsapp.net',
  client_memory = jsonb_set(
    COALESCE(client_memory, '{}'::jsonb),
    '{lid_aliases}',
    '["16089199161420@lid", "124648809357330@lid"]'::jsonb,
    true
  ),
  updated_at = now()
WHERE id = '18affde4-a6f7-4cf0-9822-4967798c1c76';

-- 5. Delete the two wrong contacts (now orphaned of conversations/deals)
DELETE FROM public.contacts
WHERE id IN (
  'adf94abc-1c93-4571-93f1-0bb6aa43a127',
  '565695ac-31d9-4c3e-9bea-111b01bb8a8b'
);

-- 6. Optional: deactivate older empty conversations of the correct contact,
-- keep only the most recent one active to avoid splitting future messages.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY last_message_at DESC) AS rn
  FROM public.conversations
  WHERE contact_id = '18affde4-a6f7-4cf0-9822-4967798c1c76'
)
UPDATE public.conversations c
SET is_active = false
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;
