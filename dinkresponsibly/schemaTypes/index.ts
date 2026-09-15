export const heroType = {
  name: 'hero',
  type: 'document',
  title: 'Hero Section',
  fields: [
    {
      name: 'description',
      type: 'text',
      title: 'Description'
    },
    {
      name: 'caption',
      type: 'string',
      title: 'Caption under Image'
    },
    {
      name: 'image',
      type: 'image',
      title: 'Hero Image',
      options: { hotspot: true }
    }
  ]
}

export const schemaTypes = [heroType]
