import type { Attachment, AttachmentEntityType, MediaType } from '@geripaws/shared';
import { createAttachmentSchema, MAX_ATTACHMENT_BYTES } from '@geripaws/shared';

import { supabase } from './supabase';

const BUCKET = 'incident-media';

export { MAX_ATTACHMENT_BYTES };

function extFromUri(localUri: string, fallback: string): string {
  const match = /\.(\w+)(\?.*)?$/.exec(localUri);
  return match?.[1]?.toLowerCase() ?? fallback;
}

/** Uploads a locally-picked photo/video (a file:// URI on native, a blob: URI
 * on web) to the private `incident-media` bucket and records it against the
 * given incident or ailment. Path convention `{petId}/{entityType}/{entityId}/...`
 * matches the RLS policies' `storage.foldername(name)[1] = petId` check. */
export async function uploadAttachment(
  petId: string,
  entityType: AttachmentEntityType,
  entityId: string,
  localUri: string,
  mediaType: MediaType,
  index = 0
): Promise<Attachment> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File is larger than the ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB limit`);
  }

  const ext = extFromUri(localUri, mediaType === 'video' ? 'mp4' : 'jpg');
  const mimeType = response.headers.get('content-type') || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
  const path = `${petId}/${entityType}/${entityId}/${Date.now()}-${index}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const input = createAttachmentSchema.parse({
    petId,
    entityType,
    entityId,
    storagePath: path,
    mediaType,
    mimeType,
    sizeBytes: arrayBuffer.byteLength,
  });

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      pet_id: input.petId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      storage_path: input.storagePath,
      media_type: input.mediaType,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      created_by: userData.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Attachment;
}

export async function fetchAttachments(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Attachment[];
}

/** One batched signed-URL request for a whole gallery rather than one per file
 * — the bucket is private, so a bare public URL won't work. */
export async function getAttachmentUrls(paths: string[], expiresInSeconds = 3600): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;

  const urls: Record<string, string> = {};
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) urls[entry.path] = entry.signedUrl;
  });
  return urls;
}

export async function deleteAttachment(attachment: Attachment): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}

/** Deletes every attachment on an entity — call before deleting the entity
 * itself so no orphaned (and still-billed) Storage objects are left behind;
 * there's no DB-level foreign key doing this automatically since entity_id
 * isn't a real FK (it can point at either habit_logs or ailments). */
export async function deleteAttachmentsFor(entityType: AttachmentEntityType, entityId: string): Promise<void> {
  const existing = await fetchAttachments(entityType, entityId);
  if (existing.length === 0) return;

  const { error: storageError } = await supabase.storage.from(BUCKET).remove(existing.map((a) => a.storage_path));
  if (storageError) throw storageError;

  const { error } = await supabase.from('attachments').delete().eq('entity_type', entityType).eq('entity_id', entityId);
  if (error) throw error;
}
