import Replicate from 'replicate'
import { createClient } from '@/app/_lib/supabase-server'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function generateAndStoreImage(prompt: string, messageId: number) {
  const supabase = await createClient()
  
  const prompt_input = {
    prompt: prompt,
    width: 512,
    height: 512,
    output_format: "jpg"
  }

  // Generate image using Replicate
  const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: prompt_input
  }) as unknown as string

  console.log('Replicate output:', output)

  if (!output) {
    throw new Error('Failed to generate image')
  }

  // Download the image
  const response = await fetch(output)
  const imageBuffer = await response.arrayBuffer()
  
  // Generate a unique filename
  const filename = `generated-${Date.now()}.jpg`
  
  // Upload to Supabase storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(filename, imageBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600'
    })

  if (uploadError) {
    throw uploadError
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filename)

  // Insert file record
  const { data: fileData, error: fileError } = await supabase
    .from('message_files')
    .insert({
      message_id: messageId,
      file_type: 'image',
      file_url: publicUrl,
      inserted_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (fileError) {
    throw fileError
  }

  return fileData
} 