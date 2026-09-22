import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: 'ntfl5n32',
  dataset: 'production',
  useCdn: false, // Set to false so updates are immediate for your defense
  apiVersion: '2023-05-03',
});
