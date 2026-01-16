# 封面图片模板变量使用指南

## 🎯 概述

现在封面图片地址已经可以作为模板变量在笔记模板中使用了！无论图片是保存在本地还是上传到图床，都可以通过以下变量在模板中引用。

## 📋 可用的模板变量

### 基础变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `{{coverImage}}` | 封面图片的完整路径（本地或远程） | `assets/book/TSITB3QY/TSITB3QY_天国之秋_cover.jpg` 或 `https://obsidian-yen.oss-cn-shanghai.aliyuncs.com/images/obsidian/202508171618713.png` |
| `{{coverImageType}}` | 图片类型 | `local`（本地）或 `remote`（图床） |
| `{{coverImageMarkdown}}` | 标准的 Markdown 图片链接 | `![天国之秋](file://assets/book/TSITB3QY/TSITB3QY_天国之秋_cover.jpg)` 或 `![天国之秋](https://obsidian-yen.oss-cn-shanghai.aliyuncs.com/images/obsidian/202508171618713.png)` |

### 本地图片变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `{{coverImageLocal}}` | 本地图片路径 | `assets/book/TSITB3QY/TSITB3QY_天国之秋_cover.jpg` |
| `{{coverImageLink}}` | Obsidian 内部链接格式 | `![[TSITB3QY_天国之秋_cover.jpg]]` |

### 图床变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `{{coverImageUrl}}` | 图床图片 URL | `https://obsidian-yen.oss-cn-shanghai.aliyuncs.com/images/obsidian/202508171618713.png` |

## 🎨 模板使用示例

### 1. 基础封面显示

```markdown
# {{title}}

{% if coverImageMarkdown %}
{{coverImageMarkdown}}
{% endif %}

**作者**: {{authors}}
**出版年份**: {{date}}
```

### 2. 根据类型显示不同格式

```markdown
# {{title}}

{% if coverImage %}
  {% if coverImageType == 'local' %}
    ![[{{coverImageLink}}]]
  {% else %}
    ![封面]({{coverImageUrl}})
  {% endif %}
{% endif %}

**作者**: {{authors}}
```

### 3. 条件显示封面

```markdown
# {{title}}

{% if coverImage %}
## 封面图片
![{{title}} 封面]({{coverImage}})
{% endif %}

{% if abstractNote %}
## 摘要
{{abstractNote}}
{% endif %}
```

### 4. 完整的书籍模板

```markdown
---
title: {{title}}
authors: {{authors}}
date: {{date}}
coverImage: {{coverImage}}
---

# {{title}}

{% if coverImage %}
<div style="text-align: center;">
  {% if coverImageType == 'local' %}
    ![[{{coverImageLink}}]]
  {% else %}
    ![{{title}} 封面]({{coverImageUrl}})
  {% endif %}
</div>
{% endif %}

## 基本信息

- **标题**: {{title}}
- **作者**: {{authors}}
- **出版年份**: {{date}}
- **类型**: {{itemType}}

{% if abstractNote %}
## 摘要

{{abstractNote}}
{% endif %}

{% if bibliography %}
## 参考文献

{{bibliography}}
{% endif %}
```

## 🔧 高级用法

### 1. 使用 Nunjucks 过滤器

```markdown
{% if coverImage %}
![封面]({{coverImage | replace(" ", "%20")}})
{% endif %}
```

### 2. 条件渲染不同尺寸

```markdown
{% if coverImage %}
  {% if coverImageType == 'local' %}
    <img src="{{coverImage}}" alt="{{title}}" width="200" />
  {% else %}
    <img src="{{coverImageUrl}}" alt="{{title}}" width="300" />
  {% endif %}
{% endif %}
```

### 3. 组合多个变量

```markdown
{% if coverImage and title %}
![{{title}} 封面]({{coverImage}})
{% endif %}
```

## 📊 变量可用性检查

### 在模板中检查变量是否存在

```markdown
{% if coverImage %}
✅ 封面图片可用: {{coverImage}}
{% else %}
❌ 没有封面图片
{% endif %}

{% if coverImageType %}
图片类型: {{coverImageType}}
{% endif %}
```

### 调试信息

```markdown
<!-- 调试信息 -->
{% if coverImage %}
- coverImage: {{coverImage}}
- coverImageType: {{coverImageType}}
{% if coverImageLocal %}
- coverImageLocal: {{coverImageLocal}}
{% endif %}
{% if coverImageUrl %}
- coverImageUrl: {{coverImageUrl}}
{% endif %}
{% if coverImageLink %}
- coverImageLink: {{coverImageLink}}
{% endif %}
{% else %}
- 没有封面图片
{% endif %}
```

## 🎯 最佳实践

### 1. 总是使用条件检查

```markdown
{% if coverImage %}
![封面]({{coverImage}})
{% endif %}
```

### 2. 根据类型选择合适的方式

```markdown
{% if coverImage %}
  {% if coverImageType == 'local' %}
    <!-- 使用 Obsidian 内部链接 -->
    ![[{{coverImageLink}}]]
  {% else %}
    <!-- 使用外部 URL -->
    ![封面]({{coverImageUrl}})
  {% endif %}
{% endif %}
```

### 3. 提供备用方案

```markdown
{% if coverImage %}
![封面]({{coverImage}})
{% else %}
*暂无封面图片*
{% endif %}
```

## 🔍 故障排除

### 1. 变量不显示

- 确保封面图片功能已启用
- 检查控制台日志中的 "✅ 封面图片模板变量已设置" 消息
- 确认图片下载/上传成功

### 2. 图片显示不正确

- 检查 `coverImageType` 变量值
- 本地图片使用 `coverImageLink`
- 图床图片使用 `coverImageUrl`

### 3. 路径问题

- 本地路径会自动生成 Obsidian 内部链接
- 图床 URL 可以直接使用
- 使用 `replace` 过滤器处理空格等特殊字符

## 📝 示例模板文件

创建一个名为 `书籍模板.md` 的文件：

```markdown
---
title: {{title}}
authors: {{authors}}
date: {{date}}
coverImage: {{coverImage}}
---

# {{title}}

{% if coverImage %}
<div style="text-align: center; margin: 20px 0;">
  {% if coverImageType == 'local' %}
    ![[{{coverImageLink}}]]
  {% else %}
    ![{{title}} 封面]({{coverImageUrl}})
  {% endif %}
</div>
{% endif %}

## 基本信息

- **标题**: {{title}}
- **作者**: {{authors}}
- **出版年份**: {{date}}
- **类型**: {{itemType}}

{% if abstractNote %}
## 摘要

{{abstractNote}}
{% endif %}

{% if bibliography %}
## 参考文献

{{bibliography}}
{% endif %}

{% if formattedAnnotationsNew %}
## 注释

{{formattedAnnotationsNew}}
{% endif %}
```

## 🎉 总结

现在您可以在模板中使用以下变量来显示封面图片：

- `{{coverImage}}` - 通用封面图片路径
- `{{coverImageLocal}}` - 本地图片路径
- `{{coverImageUrl}}` - 图床图片 URL
- `{{coverImageLink}}` - Obsidian 内部链接
- `{{coverImageType}}` - 图片类型（local/remote）

这些变量会根据您的设置（本地保存或图床上传）自动提供正确的值！🎊
