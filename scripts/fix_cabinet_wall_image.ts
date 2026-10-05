import { APPWRITE_CONFIG } from '../src/lib/appwrite/config';
import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)
  .setKey(APPWRITE_CONFIG.apiKey);

const db = new Databases(client);

async function run() {
  const doc = await db.getDocument(APPWRITE_CONFIG.databaseId, 'cabinet_models', 'cabinet-wall');
  console.log('Doc atual:', { name: doc.name, main_image: doc.main_image });

  let dims: any = {};
  try {
    if (doc.dimensions_json) dims = JSON.parse(doc.dimensions_json);
  } catch (e) {}

  const realImg = 'https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(14).png';
  
  // Filtra SVGs
  const nonSvg = (Array.isArray(dims.images) ? dims.images : []).filter((img: string) => !img.endsWith('.svg'));
  if (!nonSvg.includes(realImg)) {
    nonSvg.unshift(realImg);
  }
  dims.images = nonSvg;

  const updated = await db.updateDocument(
    APPWRITE_CONFIG.databaseId,
    'cabinet_models',
    'cabinet-wall',
    {
      main_image: realImg,
      dimensions_json: JSON.stringify(dims)
    }
  );

  console.log('Atualizado com sucesso:', {
    name: updated.name,
    main_image: updated.main_image,
    dims: JSON.parse(updated.dimensions_json)
  });
}

run().catch(console.error);
