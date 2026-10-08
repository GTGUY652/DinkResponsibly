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

export const venueRuleType = {
  name: 'venueRule',
  type: 'document',
  title: 'Venue Rules',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Rule Title',
      description: 'Bold lead-in, e.g. Strict 1-Hour Slots:',
      validation: (Rule: any) => Rule.required().max(80)
    },
    {
      name: 'description',
      type: 'text',
      title: 'Rule Description',
      description: 'Body text shown after the title.',
      validation: (Rule: any) => Rule.required()
    },
    {
      name: 'order',
      type: 'number',
      title: 'Display Order',
      description: 'Lower numbers appear first.',
      initialValue: 0
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description'
    }
  }
}

export const schemaTypes = [heroType, venueRuleType]
