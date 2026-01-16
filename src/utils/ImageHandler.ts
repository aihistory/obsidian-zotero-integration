import { RequestUrlParam, TFile, Vault, requestUrl } from 'obsidian';
import { Notice } from 'obsidian';

import { PictureBedSetting, ZoteroConnectorSettings } from '../types';

export interface ImageResult {
  success: boolean;
  error?: string;
  filepath?: string;
  url?: string;
}

export interface PicGoResult {
  success: boolean;
  result?: string[];
  message?: string;
}

export class ImageHandler {
  private settings: ZoteroConnectorSettings;
  private vault: Vault;

  constructor(settings: ZoteroConnectorSettings, vault: Vault) {
    this.settings = settings;
    this.vault = vault;
  }

  /**
   * 下载图片到本地
   */
  async downloadImage(
    url: string,
    folder: string,
    filename: string,
    headers?: any
  ): Promise<ImageResult> {
    try {
      console.log('开始下载图片:', url);
      const response = await this.httpRequestBuffer(url, headers);

      console.log('HTTP 响应状态:', response.status);
      
      // 检查 HTTP 状态码
      if (response.status !== 200) {
        if (response.status === 403) {
          throw new Error('访问被拒绝，可能需要登录或设置正确的请求头');
        } else if (response.status === 404) {
          throw new Error('图片不存在或URL无效 (404)');
        } else {
          throw new Error(`HTTP 错误: ${response.status}`);
        }
      }

      // 检查响应数据
      const buffer = response.arrayBuffer;
      if (!buffer) {
        throw new Error('响应数据为空');
      }

      console.log('图片数据大小:', buffer.byteLength, '字节');
      
      const filePath = this.joinPath(folder, filename);
      console.log('保存路径:', filePath);

      // 确保文件夹存在
      await this.ensureFolderExists(folder);

      // 保存文件
      await this.saveFile(filePath, buffer);

      console.log('图片保存成功:', filePath);
      return {
        success: true,
        filepath: filePath,
      };
    } catch (error) {
      console.error('下载图片失败:', error);
      return {
        success: false,
        error: error.toString(),
      };
    }
  }

  /**
   * 上传图片到图床
   */
  async uploadToPicGo(
    url: string,
    filename: string,
    headers?: any
  ): Promise<ImageResult> {
    try {
      console.log('开始下载图片用于上传到 PicGo:', url);
      
      // 下载图片到内存
      const response = await this.httpRequestBuffer(url, headers);

      // 检查 HTTP 状态码
      if (response.status !== 200) {
        if (response.status === 403) {
          throw new Error('访问被拒绝，可能需要登录或设置正确的请求头');
        } else if (response.status === 404) {
          throw new Error('图片不存在或URL无效 (404)');
        } else {
          throw new Error(`HTTP 错误: ${response.status}`);
        }
      }

      const buffer = response.arrayBuffer;
      if (!buffer) {
        throw new Error('响应数据为空');
      }

      console.log('图片下载成功，开始转换为 base64');

      // 尝试两种上传方法
      console.log('🔄 尝试方法1: 剪贴板上传');
      
      try {
        console.log('📋 开始写入剪贴板...');
        await this.writeImageToClipboard(buffer);
        console.log('📋 剪贴板写入完成，开始上传...');
        
        const clipboardResult = await this.uploadClipboardToPicGo();
        console.log('📋 剪贴板上传响应:', clipboardResult);
        
        if (clipboardResult.success && clipboardResult.result && clipboardResult.result.length > 0) {
          console.log('✅ 剪贴板上传成功:', clipboardResult.result[0]);
          return {
            success: true,
            url: clipboardResult.result[0],
          };
        } else {
          console.log('📋 剪贴板上传响应不成功:', clipboardResult);
        }
      } catch (clipboardError) {
        console.log('❌ 剪贴板上传失败:', clipboardError.message);
        console.log('❌ 剪贴板错误详情:', clipboardError);
      }
      
      console.log('尝试方法2: base64 上传');
      
      // 方法2: 使用 base64 上传作为备选
      const base64Data = this.arrayBufferToBase64(buffer);
      console.log('base64 数据长度:', base64Data.length);

      const picGoResult = await this.uploadBase64ToPicGo(base64Data, filename);

      if (
        picGoResult.success &&
        picGoResult.result &&
        picGoResult.result.length > 0
      ) {
        console.log('✅ PicGo 上传成功:', picGoResult.result[0]);
        return {
          success: true,
          url: picGoResult.result[0],
        };
      } else {
        throw new Error(picGoResult.message || '上传到图床失败');
      }
    } catch (error) {
      console.error('上传图片到图床失败:', error);
      return {
        success: false,
        error: error.toString(),
      };
    }
  }

  /**
   * 检查 PicGo 连接状态
   */
  async checkPicGoConnection(): Promise<boolean> {
    try {
      const url = this.settings.pictureBedSetting?.url;
      if (!url) {
        console.error('PicGo URL 未配置');
        return false;
      }

      console.log('检查 PicGo 连接:', url);

      // 方法1: 尝试 heartbeat 端点
      try {
        const heartbeatUrl = this.replaceUrlPath(url, '/heartbeat');
        console.log('尝试 heartbeat 端点:', heartbeatUrl);
        
        const response = await this.httpRequest(
          heartbeatUrl,
          {},
          { method: 'post' }
        );
        const data = response.textJson as PicGoResult;
        
        if (data?.success) {
          console.log('✅ PicGo heartbeat 检查成功');
          return true;
        }
      } catch (heartbeatError) {
        console.log('❌ heartbeat 端点失败:', heartbeatError.message);
      }

      // 方法2: 尝试直接访问上传端点
      try {
        console.log('尝试直接访问上传端点:', url);
        const response = await this.httpRequest(url, {}, { method: 'post' });
        
        // 即使返回错误，只要能连接上就说明服务在运行
        if (response.status === 200 || response.status === 400) {
          console.log('✅ PicGo 上传端点可访问');
          return true;
        }
      } catch (uploadError) {
        console.log('❌ 上传端点访问失败:', uploadError.message);
      }

      // 方法3: 尝试简单的 GET 请求检查端口是否开放
      try {
        const baseUrl = url.replace('/upload', '');
        console.log('尝试检查基础端口:', baseUrl);
        
        const response = await this.httpRequest(baseUrl, {}, { method: 'get' });
        console.log('基础端口响应状态:', response.status);
        
        // 只要有响应就说明端口开放
        if (response.status) {
          console.log('✅ PicGo 服务端口开放');
          return true;
        }
      } catch (portError) {
        console.log('❌ 端口检查失败:', portError.message);
      }

      console.error('❌ 所有 PicGo 连接检查方法都失败');
      return false;
    } catch (error) {
      console.error('❌ PicGo 连接检查异常:', error);
      return false;
    }
  }

  /**
   * 处理封面图片
   */
  async handleCoverImage(
    imageUrl: string,
    folder: string,
    filename: string,
    useHighQuality: boolean = false
  ): Promise<ImageResult> {
    if (!this.settings.cacheImage) {
      return { success: false, error: '封面下载功能未启用' };
    }

    // 尝试高清封面
    if (useHighQuality && this.settings.cacheHighQuantityImage) {
      try {
        const highQualityUrl = this.getHighQualityImageUrl(imageUrl);
        
        // 如果高清URL和原URL相同，说明转换失败，直接跳过
        if (highQualityUrl !== imageUrl) {
          console.log('尝试下载高清封面:', highQualityUrl);
          const result = await this.processImage(
            highQualityUrl,
            folder,
            filename
          );
          if (result.success) {
            console.log('高清封面下载成功');
            return result;
          }
        } else {
          console.log('无法生成高清URL，使用普通封面');
        }
      } catch (error) {
        console.log('下载高清封面失败，使用普通封面:', error.message);
      }
    }

    // 使用普通封面
    return await this.processImage(imageUrl, folder, filename);
  }

  /**
   * 处理图片（下载到本地或上传到图床）
   */
  private async processImage(
    imageUrl: string,
    folder: string,
    filename: string
  ): Promise<ImageResult> {
    const headers = { referer: imageUrl };

    // 如果启用了图床功能，尝试上传到图床
    if (this.settings.pictureBedFlag) {
      console.log('图床功能已启用，检查 PicGo 连接...');
      const isConnected = await this.checkPicGoConnection();
      
      if (isConnected) {
        console.log('PicGo 连接成功，开始上传图片...');
        const result = await this.uploadToPicGo(imageUrl, filename, headers);
        if (result.success) {
          console.log('✅ 图片成功上传到图床:', result.url);
          return result;
        } else {
          console.log('❌ 图片上传到图床失败:', result.error);
          new Notice(`图片上传到图床失败: ${result.error}，将使用本地保存方式`);
        }
      } else {
        const url = this.settings.pictureBedSetting?.url || '未配置';
        console.error('❌ 无法连接到 PicGo 服务');
        new Notice(
          `无法连接到PicGo,上传链接：@${url}\n\n请检查：\n1. PicGo 是否已启动\n2. 端口配置是否正确 (默认: 36677)\n3. PicGo Server 插件是否已启用\n\n将使用本地保存方式`,
          8000
        );
      }
    }

    // 下载到本地
    return await this.downloadImage(imageUrl, folder, filename, headers);
  }

  /**
   * 获取高清封面URL
   */
  private getHighQualityImageUrl(imageUrl: string): string {
    // 豆瓣高清封面URL转换规则
    // 小图：/s/public/s29651121.jpg -> 大图：/l/public/l29651121.jpg
    // 但并不是所有图片都有高清版本，所以需要容错处理
    
    console.log('原始URL:', imageUrl);
    
    // 方法1：将 /s/public/s 替换为 /l/public/l
    let highQualityUrl = imageUrl.replace(/\/s\/public\/s(\d+)\./, '/l/public/l$1.');
    
    // 方法2：如果方法1没有匹配，尝试简单的 s->l 替换
    if (highQualityUrl === imageUrl) {
      highQualityUrl = imageUrl.replace(/\/s(\d+)\./, '/l$1.');
    }
    
    console.log('高清URL:', highQualityUrl);
    return highQualityUrl;
  }

  /**
   * HTTP 请求获取 Buffer
   */
  private async httpRequestBuffer(url: string, headers?: any): Promise<any> {
    const params: RequestUrlParam = {
      url: url,
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...headers,
      },
    };

    return await requestUrl(params);
  }

  /**
   * HTTP 请求
   */
  private async httpRequest(
    url: string,
    headers?: any,
    options?: any
  ): Promise<any> {
    const params: RequestUrlParam = {
      url: url,
      method: options?.method || 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...headers,
      },
    };

    return await requestUrl(params);
  }

  /**
   * 将图片写入剪贴板
   */
  private async writeImageToClipboard(buffer: ArrayBuffer): Promise<void> {
    try {
      const { clipboard, nativeImage } = require('electron');
      
      // 将 ArrayBuffer 转换为 Node.js Buffer
      const nodeBuffer = Buffer.from(buffer);
      
      console.log('创建图片对象，Buffer 大小:', nodeBuffer.length);
      
      // 创建 NativeImage 并写入剪贴板
      const image = nativeImage.createFromBuffer(nodeBuffer);
      if (image.isEmpty()) {
        throw new Error('创建的图片对象为空，可能是图片数据损坏');
      }
      
      await clipboard.writeImage(image);
      console.log('✅ 图片成功写入剪贴板');
    } catch (error) {
      console.error('写入剪贴板详细错误:', error);
      throw new Error('写入剪贴板失败: ' + error.toString());
    }
  }

  /**
   * 上传剪贴板内容到 PicGo (备选方法)
   */
  private async uploadClipboardToPicGo(): Promise<PicGoResult> {
    const url = this.settings.pictureBedSetting?.url;
    if (!url) {
      throw new Error('PicGo URL 未配置');
    }

    console.log('使用剪贴板方法上传到 PicGo:', url);
    
    try {
      const response = await this.httpRequest(url, {
        'Content-Type': 'application/json'
      }, { method: 'post' });
      
      console.log('剪贴板上传响应状态:', response.status);
      console.log('剪贴板上传响应内容:', response.text);
      
      if (response.status !== 200) {
        throw new Error(`PicGo 服务器返回错误状态: ${response.status}`);
      }
      
      let result: PicGoResult;
      
      if (response.json) {
        result = response.json as PicGoResult;
      } else if (response.text) {
        try {
          result = JSON.parse(response.text) as PicGoResult;
        } catch (parseError) {
          throw new Error(`无法解析 PicGo 响应: ${response.text}`);
        }
      } else {
        throw new Error('PicGo 响应中没有可解析的内容');
      }
      
      return result;
    } catch (error) {
      console.error('剪贴板上传失败:', error);
      throw error;
    }
  }

  /**
   * 使用 base64 数据上传到 PicGo (正确的 JSON 格式)
   */
  private async uploadBase64ToPicGo(base64Data: string, filename: string): Promise<PicGoResult> {
    const url = this.settings.pictureBedSetting?.url;
    if (!url) {
      throw new Error('PicGo URL 未配置');
    }

    console.log('开始使用 JSON 格式上传到 PicGo:', url);
    console.log('文件名:', filename);
    
    // 构造 PicGo 期望的 JSON 格式
    // 根据错误分析，PicGo 期望的是简单的字符串数组，包含 data URI
    const dataUri = `data:image/jpeg;base64,${base64Data}`;
    
    const requestData = {
      list: [dataUri]
    };
    
    console.log('PicGo 请求数据结构:', {
      list: [`data:image/jpeg;base64,${base64Data.substring(0, 50)}...`],
      totalDataUriLength: dataUri.length
    });
    
    try {
      const response = await this.httpRequestJSON(url, requestData);
      
      console.log('PicGo 响应状态:', response.status);
      console.log('PicGo 响应内容:', response.text);
      
      if (response.status !== 200) {
        throw new Error(`PicGo 服务器返回错误状态: ${response.status}`);
      }
      
      let result: PicGoResult;
      
      // 尝试不同的解析方式
      if (response.json) {
        result = response.json as PicGoResult;
      } else if (response.text) {
        try {
          result = JSON.parse(response.text) as PicGoResult;
        } catch (parseError) {
          throw new Error(`无法解析 PicGo 响应: ${response.text}`);
        }
      } else {
        throw new Error('PicGo 响应中没有可解析的内容');
      }
      
      if (!result) {
        throw new Error('PicGo 返回空响应');
      }
      
      console.log('PicGo 上传结果:', result);
      
      // 验证结果格式
      if (!result.success) {
        throw new Error(`PicGo 上传失败: ${result.message || '未知错误'}`);
      }
      
      if (!result.result || !Array.isArray(result.result) || result.result.length === 0) {
        throw new Error('PicGo 返回的结果中没有图片URL');
      }
      
      return result;
    } catch (error) {
      console.error('PicGo JSON 上传请求失败:', error);
      throw error;
    }
  }

  /**
   * 将 ArrayBuffer 转换为 base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 发送 JSON 数据的 HTTP 请求
   */
  private async httpRequestJSON(url: string, data: any): Promise<any> {
    const params: RequestUrlParam = {
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      body: JSON.stringify(data),
    };

    return await requestUrl(params);
  }

  /**
   * 确保文件夹存在
   */
  private async ensureFolderExists(folder: string): Promise<void> {
    try {
      // 检查文件夹是否存在
      const folderExists = await this.vault.adapter.exists(folder);
      if (!folderExists) {
        // 创建文件夹 - 使用正确的 Obsidian API
        await this.vault.createFolder(folder);
      }
    } catch (error) {
      console.error('创建文件夹失败:', error);
      // 如果创建失败，尝试创建父目录
      const parentDir = folder.split('/').slice(0, -1).join('/');
      if (parentDir && parentDir !== folder) {
        await this.ensureFolderExists(parentDir);
        await this.vault.createFolder(folder);
      }
    }
  }

  /**
   * 保存文件
   */
  private async saveFile(filePath: string, buffer: ArrayBuffer): Promise<void> {
    try {
      // 检查文件是否已存在
      const fileExists = await this.vault.adapter.exists(filePath);
      if (fileExists) {
        // 如果文件已存在，删除它
        await this.vault.adapter.remove(filePath);
      }

      // 保存新文件 - 使用正确的 Obsidian API
      await this.vault.adapter.writeBinary(filePath, buffer);
    } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
    }
  }

  /**
   * 路径拼接
   */
  private joinPath(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }

  /**
   * 替换 URL 路径
   */
  private replaceUrlPath(url: string, newPath: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.pathname = newPath;
      return urlObj.toString();
    } catch (error) {
      return url + newPath;
    }
  }
}
