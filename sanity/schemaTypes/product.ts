import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: 'fullDescription',
      title: 'Full Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'price',
      title: 'Price (NGN)',
      type: 'number',
      description: 'Leave empty if price is on request',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'NGN',
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'object',
      fields: [
        defineField({
          name: 'length',
          title: 'Length',
          type: 'number',
        }),
        defineField({
          name: 'width',
          title: 'Width',
          type: 'number',
        }),
        defineField({
          name: 'thickness',
          title: 'Thickness',
          type: 'number',
        }),
        defineField({
          name: 'unit',
          title: 'Unit',
          type: 'string',
          options: {
            list: [
              { title: 'Millimetres', value: 'mm' },
              { title: 'Centimetres', value: 'cm' },
              { title: 'Metres', value: 'm' },
            ],
          },
          initialValue: 'mm',
        }),
      ],
    }),
    defineField({
      name: 'materialType',
      title: 'Material Type',
      type: 'string',
      options: {
        list: [
          { title: 'MDF', value: 'MDF' },
          { title: 'HDF', value: 'HDF' },
          { title: 'UV Gloss', value: 'UV Gloss' },
          { title: 'Marine Board', value: 'Marine Board' },
          { title: 'Edge Tape', value: 'Edge Tape' },
          { title: 'Door', value: 'Door' },
          { title: 'PU Stone Panel', value: 'PU Stone Panel' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'colorFinish',
      title: 'Color / Finish',
      type: 'string',
    }),
    defineField({
      name: 'stockStatus',
      title: 'Stock Status',
      type: 'string',
      options: {
        list: [
          { title: 'In Stock', value: 'in_stock' },
          { title: 'Out of Stock', value: 'out_of_stock' },
          { title: 'On Request', value: 'on_request' },
        ],
      },
      initialValue: 'in_stock',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Product Images',
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
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured Product',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'metaTitle',
      title: 'SEO Meta Title',
      type: 'string',
      description: 'Override the default meta title for this product page',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'metaDescription',
      title: 'SEO Meta Description',
      type: 'text',
      rows: 2,
      description: 'Override the default meta description for this product page',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category.name',
      media: 'images.0',
    },
  },
})
