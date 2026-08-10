import { describe, it, expect, vi } from 'vitest';
import { uploadProductImage } from './storage';

describe('uploadProductImage', () => {
  it('uploads the file to the product-images bucket and returns the public URL', async () => {
    const upload = vi.fn(async () => ({ data: { path: 'llavero-nuevo-123.png' }, error: null }));
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/product-images/llavero-nuevo-123.png' } }));
    const client = { storage: { from: vi.fn(() => ({ upload, getPublicUrl })) } } as any;

    const file = new File(['fake-image-bytes'], 'llavero-nuevo.png', { type: 'image/png' });
    const url = await uploadProductImage(client, file);

    expect(client.storage.from).toHaveBeenCalledWith('product-images');
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/llavero-nuevo/), file, { upsert: false });
    expect(url).toBe('https://x.supabase.co/storage/v1/object/public/product-images/llavero-nuevo-123.png');
  });
});
