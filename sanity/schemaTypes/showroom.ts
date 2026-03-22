import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'showroom',
  title: 'Showroom',
  type: 'document',
  fields: [
    defineField({
      name: 'address',
      title: 'Street Address',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      initialValue: 'Lagos',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'state',
      title: 'State',
      type: 'string',
      initialValue: 'Lagos',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mapEmbedUrl',
      title: 'Google Maps Embed URL',
      type: 'url',
      description: 'Paste the Google Maps embed iframe src URL',
    }),
    defineField({
      name: 'phone',
      title: 'Phone Numbers',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'whatsapp',
      title: 'WhatsApp Number',
      type: 'string',
      description: 'International format without + (e.g. 2348012345678)',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening Hours',
      type: 'object',
      fields: [
        defineField({
          name: 'weekdays',
          title: 'Monday - Friday',
          type: 'string',
          initialValue: '8:00 AM - 6:00 PM',
        }),
        defineField({
          name: 'saturday',
          title: 'Saturday',
          type: 'string',
          initialValue: '9:00 AM - 4:00 PM',
        }),
        defineField({
          name: 'sunday',
          title: 'Sunday',
          type: 'string',
          initialValue: 'Closed',
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Showroom Gallery',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'address',
      subtitle: 'city',
    },
  },
})
