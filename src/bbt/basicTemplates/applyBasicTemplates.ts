import { moment } from 'obsidian';

import { renderTemplate } from '../template.env';

const creatorTemplate = `
{%- if creators and creators.length > 0 -%}
  {%- for creator in creators -%}
    {%- if creator.name -%}
      {{creator.name}}
    {%- else -%}
      {{creator.firstName}} {{creator.lastName}}
    {%- endif -%}
    {% if not loop.last %}, {% endif %}
  {%- endfor -%}
{%- endif -%}
`;

const pdfLinkTemplate = `
{%- if attachments and attachments.length > 0 -%}
{%- set file = attachments | filterby("path", "endswith", ".pdf") | first -%}
{%- if file and file.path and file.path.endsWith(".pdf") -%}
	[{{file.title}}](file://{{file.path | replace(" ", "%20")}})
{%- endif -%}
{%- endif -%}
`;

const pdfZoteroLinkTemplate = `
{%- if attachments and attachments.length > 0 -%}
{%- set file = attachments | filterby("path", "endswith", ".pdf") | first -%}
{%- if file and file.path and file.path.endsWith(".pdf") -%}
	[{{file.title}}]({{file.desktopURI}})
{%- endif -%}
{%- endif -%}
`;

const attachmentLinkTemplate = `
{%- if attachments and attachments.length > 0 -%}
{%- set file = attachments | first -%}
{%- if file and file.path -%}
	[{{file.title}}](file://{{file.path | replace(" ", "%20")}})
{%- endif -%}
{%- endif -%}
`;

const attachmentZoteroLinkTemplate = `
{%- if attachments and attachments.length > 0 -%}
{%- set file = attachments | first -%}
{%- if file and file.path -%}
	[{{file.title}}]({{file.desktopURI}})
{%- endif -%}
{%- endif -%}
`;

const annotationsTemplate = `
{%- if annotations and annotations.length > 0 -%}
{%- set annots = annotations | filterby("date", "dateafter", lastExportDate) -%}
{%- if annots.length > 0 %}
**Imported: {{importDate | format("YYYY-MM-DD")}}**

{% for annotation in annots -%}
	{%- if annotation.annotatedText -%}
    > “{{annotation.annotatedText}}”{% if annotation.color %} {{annotation.colorCategory}} {{annotation.type | capitalize}} {% else %} {{annotation.type | capitalize}} {% endif %}[Page {{annotation.page}}]({{annotation.attachment.desktopURI.replace("select", "open-pdf")}}?page={{annotation.pageLabel}}&annotation={{annotation.id}})
    {%- endif %}
	{%- if annotation.imageRelativePath -%}
	> ![[{{annotation.imageRelativePath}}]]
    {%- endif %}
{% if annotation.comment %}
{{annotation.comment}}
{% endif %}
{% endfor -%}
{%- endif -%}
{%- endif -%}
`;

export async function applyBasicTemplates(
  sourceFile: string,
  itemData: Record<any, any>
) {
  if (!itemData) return itemData;

  const creatorsByType = (itemData.creators || []).reduce(
    (byType: any, current: any) => {
      if (!byType[current.creatorType]) byType[current.creatorType] = [];
      byType[current.creatorType].push(current);
      return byType;
    },
    {}
  );

  await Promise.all(
    Object.keys(creatorsByType).map(async (type) => {
      itemData[`${type}s`] = (
        await renderTemplate(sourceFile, creatorTemplate, {
          creators: creatorsByType[type],
        })
      ).trim();
    })
  );

  const pdfLink = (
    await renderTemplate(sourceFile, pdfLinkTemplate, itemData)
  ).trim();
  if (pdfLink) itemData.pdfLink = pdfLink;

  const pdfZoteroLink = (
    await renderTemplate(sourceFile, pdfZoteroLinkTemplate, itemData)
  ).trim();
  if (pdfZoteroLink) itemData.pdfZoteroLink = pdfZoteroLink;

  const attachmentLink = (
    await renderTemplate(sourceFile, attachmentLinkTemplate, itemData)
  ).trim();
  if (attachmentLink) itemData.firstAttachmentLink = attachmentLink;

  const attachmentZoteroLink = (
    await renderTemplate(sourceFile, attachmentZoteroLinkTemplate, itemData)
  ).trim();
  if (attachmentZoteroLink)
    itemData.firstAttachmentZoteroLink = attachmentZoteroLink;

  if (itemData.notes?.length) {
    const notes = itemData.notes
      .reduce((combined: string, current: any) => {
        if (current.note) {
          return `${combined}\n\n${current.note.trim()}`;
        }

        return combined;
      }, '')
      .trim();

    if (notes) {
      itemData.markdownNotes = notes;
    }
  }

  if (itemData.tags?.length) {
    itemData.allTags = itemData.tags.map((t: any) => t.tag).join(', ');
    itemData.hashTags = itemData.tags
      .map((t: any) => `#${t.tag.replace(/\s+/g, '-')}`)
      .join(', ');
  }

  if (itemData.annotations?.length) {
    itemData.formattedAnnotationsNew = (
      await renderTemplate(sourceFile, annotationsTemplate, itemData)
    ).trim();

    itemData.formattedAnnotations = (
      await renderTemplate(sourceFile, annotationsTemplate, {
        ...itemData,
        lastExportDate: moment(0),
      })
    ).trim();
  }

  // 处理封面图片相关的模板变量
  if (itemData.coverImagePath) {
    // 添加封面图片路径作为模板变量
    itemData.coverImage = itemData.coverImagePath;
    
    // 根据路径类型添加不同的变量
    if (itemData.coverImagePath.startsWith('http')) {
      // 图床地址
      itemData.coverImageUrl = itemData.coverImagePath;
      itemData.coverImageType = 'remote';
      
      // 生成标准的 Markdown 图片链接
      const title = itemData.title || '封面图片';
      itemData.coverImageMarkdown = `![${title}](${itemData.coverImagePath})`;
    } else {
      // 本地文件路径
      itemData.coverImageLocal = itemData.coverImagePath;
      itemData.coverImageType = 'local';
      
      // 生成 Obsidian 内部链接格式
      const fileName = itemData.coverImagePath.split('/').pop();
      if (fileName) {
        itemData.coverImageLink = `![[${fileName}]]`;
      }
      
      // 生成标准的 Markdown 图片链接（使用 file:// 协议）
      const title = itemData.title || '封面图片';
      const filePath = itemData.coverImagePath.replace(/ /g, '%20');
      itemData.coverImageMarkdown = `![${title}](file://${filePath})`;
    }
    
    console.log('✅ 封面图片模板变量已设置:', {
      coverImage: itemData.coverImage,
      coverImageUrl: itemData.coverImageUrl,
      coverImageLocal: itemData.coverImageLocal,
      coverImageType: itemData.coverImageType,
      coverImageLink: itemData.coverImageLink,
      coverImageMarkdown: itemData.coverImageMarkdown
    });
  }

  return itemData;
}
