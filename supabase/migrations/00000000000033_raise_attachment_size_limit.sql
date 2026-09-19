-- The 150 MB incident-media limit (set in 00000000000015_attachments.sql)
-- assumed uploads would "land well under this after compression" — true for
-- photos (see prepareImageForUpload), never implemented for video. A real
-- seizure clip at typical (1080p HEVC) phone recording settings routinely
-- exceeds 150 MB for just a few minutes of footage, so this was silently
-- blocking the app's core use case. Raised to 500 MB, matching
-- MAX_ATTACHMENT_BYTES in packages/shared/src/schemas.ts (kept in sync
-- manually — see that file's comment).
update storage.buckets
set file_size_limit = 524288000
where id = 'incident-media';
