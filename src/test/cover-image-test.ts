/**
 * 封面图片功能测试
 * 这个文件用于测试封面图片处理功能是否正常工作
 */

import { ZoteroConnectorSettings, PictureBedType } from '../types';
import { ImageHandler } from '../utils/ImageHandler';
import { CoverImageService } from '../services/CoverImageService';

// 模拟设置
const mockSettings: ZoteroConnectorSettings = {
  citeFormats: [],
  database: 'Zotero',
  exportFormats: [],
  noteImportFolder: '',
  openNoteAfterImport: false,
  whichNotesToOpenAfterImport: 'first-imported-note',
  
  // 封面相关设置
  cacheImage: true,
  cacheHighQuantityImage: true,
  attachmentPath: 'assets',
  pictureBedFlag: false,
  pictureBedType: PictureBedType.PicGo,
  pictureBedSetting: {
    url: 'http://127.0.0.1:36677/upload'
  },
};

// 模拟 Zotero 项目数据
const mockZoteroItem = {
  citekey: 'test2024',
  title: '测试书籍',
  itemType: 'book',
  attachments: [
    {
      path: 'test-cover.jpg',
      url: 'https://example.com/test-cover.jpg',
      contentType: 'image/jpeg'
    }
  ],
  coverImage: 'https://example.com/cover.jpg'
};

// 测试函数
export async function testCoverImageFunctionality() {
  console.log('开始测试封面图片功能...');

  try {
    // 测试设置验证
    console.log('1. 测试设置验证...');
    console.log('封面下载功能:', mockSettings.cacheImage ? '启用' : '禁用');
    console.log('高清封面功能:', mockSettings.cacheHighQuantityImage ? '启用' : '禁用');
    console.log('图床功能:', mockSettings.pictureBedFlag ? '启用' : '禁用');
    console.log('附件路径:', mockSettings.attachmentPath);

    // 测试文件名生成
    console.log('2. 测试文件名生成...');
    const testFilename = generateTestFilename(mockZoteroItem);
    console.log('生成的封面文件名:', testFilename);

    // 测试图片URL提取
    console.log('3. 测试图片URL提取...');
    const coverUrl = extractCoverUrl(mockZoteroItem);
    console.log('提取的封面URL:', coverUrl);

    // 测试附件文件夹路径生成
    console.log('4. 测试附件文件夹路径生成...');
    const attachmentFolder = generateAttachmentFolder(mockZoteroItem);
    console.log('附件文件夹路径:', attachmentFolder);

    console.log('封面图片功能测试完成！');
    return true;
  } catch (error) {
    console.error('测试过程中出现错误:', error);
    return false;
  }
}

/**
 * 实际测试封面下载功能
 */
export async function testActualCoverDownload() {
  console.log('开始实际测试封面下载功能...');
  
  try {
    // 创建一个模拟的 vault 对象
    const mockVault = {
      adapter: {
        exists: async (path: string) => false,
        writeBinary: async (path: string, data: ArrayBuffer) => {
          console.log('模拟保存文件:', path, '大小:', data.byteLength);
          return Promise.resolve();
        },
        remove: async (path: string) => {
          console.log('模拟删除文件:', path);
          return Promise.resolve();
        }
      },
      createFolder: async (path: string) => {
        console.log('模拟创建文件夹:', path);
        return Promise.resolve();
      }
    };

    // 创建 ImageHandler 实例
    const imageHandler = new ImageHandler(mockSettings, mockVault as any);
    
    // 测试图片URL
    const testImageUrl = 'https://img9.doubanio.com/view/subject/s/public/s1070959.jpg';
    const testFolder = 'assets/test';
    const testFilename = 'test_cover.jpg';
    
    console.log('测试下载图片:', testImageUrl);
    console.log('目标文件夹:', testFolder);
    console.log('文件名:', testFilename);
    
    // 尝试下载图片
    const result = await imageHandler.downloadImage(testImageUrl, testFolder, testFilename);
    
    console.log('下载结果:', result);
    
    if (result.success) {
      console.log('✅ 图片下载成功！');
      console.log('文件路径:', result.filepath);
    } else {
      console.log('❌ 图片下载失败！');
      console.log('错误信息:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('实际测试过程中出现错误:', error);
    return false;
  }
}

/**
 * 测试封面服务功能
 */
export async function testCoverImageService() {
  console.log('开始测试封面图片服务...');
  
  try {
    // 创建模拟的 vault 对象
    const mockVault = {
      adapter: {
        exists: async (path: string) => false,
        writeBinary: async (path: string, data: ArrayBuffer) => {
          console.log('模拟保存文件:', path, '大小:', data.byteLength);
          return Promise.resolve();
        },
        remove: async (path: string) => {
          console.log('模拟删除文件:', path);
          return Promise.resolve();
        }
      },
      createFolder: async (path: string) => {
        console.log('模拟创建文件夹:', path);
        return Promise.resolve();
      }
    };

    // 创建 CoverImageService 实例
    const coverImageService = new CoverImageService(mockSettings, mockVault as any);
    
    // 测试项目数据
    const testItem = {
      citekey: 'test2024',
      title: '测试书籍',
      itemType: 'book',
      coverImage: 'https://img9.doubanio.com/view/subject/s/public/s1070959.jpg',
      attachments: [
        {
          path: 'test-cover.jpg',
          url: 'https://img9.doubanio.com/view/subject/s/public/s1070959.jpg',
          contentType: 'image/jpeg'
        }
      ]
    };
    
    console.log('测试项目:', testItem);
    
    // 测试封面处理
    const attachmentFolder = coverImageService.getAttachmentFolder(testItem);
    console.log('附件文件夹:', attachmentFolder);
    
    const coverImagePath = await coverImageService.processZoteroCoverImage(testItem, attachmentFolder);
    
    console.log('封面处理结果:', coverImagePath);
    
    if (coverImagePath) {
      console.log('✅ 封面处理成功！');
      console.log('封面路径:', coverImagePath);
    } else {
      console.log('❌ 封面处理失败！');
    }
    
    return !!coverImagePath;
  } catch (error) {
    console.error('封面服务测试过程中出现错误:', error);
    return false;
  }
}

// 辅助函数
function generateTestFilename(item: any): string {
  const citekey = item.citekey || item.key || 'unknown';
  const title = item.title || 'untitled';
  const cleanTitle = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
  return `${citekey}_${cleanTitle}_cover.jpg`;
}

function extractCoverUrl(item: any): string | null {
  // 检查附件
  if (item.attachments && Array.isArray(item.attachments)) {
    for (const attachment of item.attachments) {
      if (isImageAttachment(attachment)) {
        return attachment.url || attachment.path;
      }
    }
  }

  // 检查其他字段
  if (item.coverImage) return item.coverImage;
  if (item.image) return item.image;

  const possibleImageFields = ['thumbnail', 'preview', 'cover', 'imageUrl'];
  for (const field of possibleImageFields) {
    if (item[field]) return item[field];
  }

  return null;
}

function isImageAttachment(attachment: any): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const contentType = attachment.contentType || '';
  const path = attachment.path || '';
  const url = attachment.url || '';

  if (contentType.startsWith('image/')) return true;

  const lowerPath = path.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  for (const ext of imageExtensions) {
    if (lowerPath.endsWith(ext) || lowerUrl.endsWith(ext)) {
      return true;
    }
  }

  return false;
}

function generateAttachmentFolder(item: any): string {
  const baseFolder = mockSettings.attachmentPath || 'assets';
  const itemType = item.itemType || 'unknown';
  const citekey = item.citekey || item.key || 'unknown';
  return `${baseFolder}/${itemType}/${citekey}`;
}

// 导出测试函数供外部调用
export { mockSettings, mockZoteroItem };
