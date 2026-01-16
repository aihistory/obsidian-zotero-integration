import { Vault, requestUrl } from 'obsidian';

import { ZoteroConnectorSettings } from '../types';
import { ImageHandler, ImageResult } from '../utils/ImageHandler';

export interface CoverImageData {
  url: string;
  title: string;
  type: string;
  citekey: string;
}

export class CoverImageService {
  private imageHandler: ImageHandler;
  private settings: ZoteroConnectorSettings;
  private vault: Vault;

  constructor(settings: ZoteroConnectorSettings, vault: Vault) {
    this.settings = settings;
    this.vault = vault;
    this.imageHandler = new ImageHandler(settings, vault);
  }

  /**
   * 处理 Zotero 项目的封面图片
   */
  async processZoteroCoverImage(
    item: any,
    folder: string
  ): Promise<string | null> {
    try {
      // 检查是否有封面图片
      const coverImageUrl = await this.extractCoverImageUrl(item);
      if (!coverImageUrl) {
        return null;
      }

      // 生成文件名
      const filename = this.generateCoverFilename(item);

      // 处理封面图片
      const result = await this.imageHandler.handleCoverImage(
        coverImageUrl,
        folder,
        filename,
        true // 尝试高清封面
      );

      if (result.success) {
        // 返回本地路径或图床URL
        return result.filepath || result.url || null;
      }

      return null;
    } catch (error) {
      console.error('处理封面图片失败:', error);
      return null;
    }
  }

  /**
   * 从 Zotero 项目中提取封面图片URL
   */
  private async extractCoverImageUrl(item: any): Promise<string | null> {
    console.log('开始提取封面URL，项目数据:', item);
    
    // 检查是否有封面相关的字段
    if (item.coverImage) {
      console.log('找到 coverImage:', item.coverImage);
      return item.coverImage;
    }

    if (item.image) {
      console.log('找到 image:', item.image);
      return item.image;
    }

    // 检查 Zotero 特有的字段
    if (item.cover) {
      console.log('找到 cover:', item.cover);
      return item.cover;
    }

    if (item.thumbnail) {
      console.log('找到 thumbnail:', item.thumbnail);
      return item.thumbnail;
    }

    // 检查附件中的图片
    if (item.attachments && Array.isArray(item.attachments)) {
      console.log('检查附件，数量:', item.attachments.length);
      for (const attachment of item.attachments) {
        console.log('检查附件:', attachment);
        if (this.isImageAttachment(attachment)) {
          const url = attachment.url || attachment.path;
          console.log('找到图片附件:', url);
          return url;
        }
      }
    }

    // 检查其他可能的字段
    const possibleImageFields = ['preview', 'imageUrl', 'coverUrl', 'thumbnailUrl', 'poster'];
    for (const field of possibleImageFields) {
      if (item[field]) {
        console.log(`找到 ${field}:`, item[field]);
        return item[field];
      }
    }

    // 检查 Zotero 的 URL 字段
    if (item.url && this.isImageUrl(item.url)) {
      console.log('找到 URL 字段中的图片:', item.url);
      return item.url;
    }

    // 尝试从豆瓣页面获取封面图片URL
    if ((item.url && item.url.includes('douban.com')) || item.libraryCatalog === 'Douban') {
      const doubanCoverUrl = await this.extractDoubanCoverFromPage(item.url);
      if (doubanCoverUrl) {
        console.log('从豆瓣页面提取封面URL:', doubanCoverUrl);
        return doubanCoverUrl;
      }
    }

    console.log('未找到封面图片URL');
    return null;
  }

  /**
   * 从豆瓣页面提取封面图片URL (使用 OpenGraph 元数据)
   */
  private async extractDoubanCoverFromPage(doubanUrl: string): Promise<string | null> {
    try {
      console.log('尝试从豆瓣页面提取封面:', doubanUrl);
      
      if (!doubanUrl) {
        console.log('豆瓣URL为空');
        return null;
      }
      
      // 使用 Obsidian 的 requestUrl 获取页面内容
      const response = await requestUrl({
        url: doubanUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6',
          'Referer': 'https://www.douban.com/'
        }
      });
      
      if (response.status !== 200) {
        console.log('豆瓣页面请求失败，状态码:', response.status);
        return null;
      }
      
      const html = response.text;
      console.log('成功获取豆瓣页面内容，长度:', html.length);
      
      // 使用正则表达式提取 og:image 内容
      // <meta property="og:image" content="https://img2.doubanio.com/view/subject/s/public/s25938605.jpg" />
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      
      if (ogImageMatch && ogImageMatch[1]) {
        const coverUrl = ogImageMatch[1];
        console.log('从 og:image 提取封面URL:', coverUrl);
        return coverUrl;
      }
      
      // 备用方法：查找其他可能的图片元素
      const imgMatch = html.match(/<img[^>]+src=["']([^"']*doubanio\.com[^"']*)["'][^>]*>/i);
      if (imgMatch && imgMatch[1]) {
        const imgUrl = imgMatch[1];
        console.log('从 img 标签提取封面URL:', imgUrl);
        return imgUrl;
      }
      
      console.log('未在豆瓣页面中找到封面图片');
      return null;
      
    } catch (error) {
      console.error('从豆瓣页面提取封面时出错:', error);
      return null;
    }
  }

  /**
   * 检查附件是否是图片类型
   */
  private isImageAttachment(attachment: any): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const contentType = attachment.contentType || '';
    const path = attachment.path || '';
    const url = attachment.url || '';

    // 检查 MIME 类型
    if (contentType.startsWith('image/')) {
      return true;
    }

    // 检查文件扩展名
    const lowerPath = path.toLowerCase();
    const lowerUrl = url.toLowerCase();

    for (const ext of imageExtensions) {
      if (lowerPath.endsWith(ext) || lowerUrl.endsWith(ext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查 URL 是否是图片
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  }

  /**
   * 生成封面文件名
   */
  private generateCoverFilename(item: any): string {
    const citekey = item.citekey || item.key || 'unknown';
    const title = item.title || 'untitled';

    // 清理文件名中的非法字符
    const cleanTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);

    return `${citekey}_${cleanTitle}_cover.jpg`;
  }

  /**
   * 在 Markdown 内容中插入封面图片
   */
  insertCoverImageToMarkdown(
    markdown: string,
    coverImagePath: string | null
  ): string {
    if (!coverImagePath) {
      return markdown;
    }

    // 在文档开头插入封面图片
    const coverImageMarkdown = `![封面](${coverImagePath})\n\n`;

    return coverImageMarkdown + markdown;
  }

  /**
   * 获取附件文件夹路径
   */
  getAttachmentFolder(item: any): string {
    const baseFolder = this.settings.attachmentPath || 'assets';

    // 可以根据项目类型或其他属性自定义文件夹结构
    const itemType = item.itemType || 'unknown';
    const citekey = item.citekey || item.key || 'unknown';

    return `${baseFolder}/${itemType}/${citekey}`;
  }

  /**
   * 检查是否应该处理封面图片
   */
  shouldProcessCoverImage(): boolean {
    return this.settings.cacheImage === true;
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: ZoteroConnectorSettings): void {
    this.settings = newSettings;
    this.imageHandler = new ImageHandler(newSettings, this.vault);
  }
}
