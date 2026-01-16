import { exportToMarkdown as originalExportToMarkdown } from '../bbt/export';
import { ExportToMarkdownParams } from '../types';
import { ZoteroConnectorSettings } from '../types';
import { CoverImageService } from './CoverImageService';

export interface ExtendedExportParams extends ExportToMarkdownParams {
  coverImageService: CoverImageService;
}

export class ExportService {
  private coverImageService: CoverImageService;

  constructor(coverImageService: CoverImageService) {
    this.coverImageService = coverImageService;
  }

  /**
   * 扩展的导出功能，包含封面图片处理
   */
  async exportToMarkdownWithCoverImages(
    params: ExtendedExportParams
  ): Promise<string[]> {
    console.log('开始导出，包含封面图片处理');
    
    // 首先执行原始的导出功能
    const markdownFiles = await originalExportToMarkdown(params);

    // 如果启用了封面图片功能，处理封面
    if (this.coverImageService.shouldProcessCoverImage()) {
      console.log('封面图片功能已启用，开始处理封面');
      await this.processCoverImagesForExportedFiles(params, markdownFiles);
    } else {
      console.log('封面图片功能未启用');
    }

    return markdownFiles;
  }

  /**
   * 为导出的文件处理封面图片
   */
  private async processCoverImagesForExportedFiles(
    params: ExtendedExportParams,
    markdownFiles: string[]
  ): Promise<void> {
    try {
      console.log('开始处理封面图片，文件数量:', markdownFiles.length);
      
      // 获取项目数据
      const { database, exportFormat, settings } = params;
      
      // 这里需要获取导出的项目数据
      // 由于原始导出函数的复杂性，我们需要重新获取项目数据
      const citeKeys = await this.getCiteKeys(database);
      if (!citeKeys.length) {
        console.log('没有找到引用键');
        return;
      }

      const libraryID = citeKeys[0].library;
      const itemData = await this.getItemJSONFromCiteKeys(citeKeys, database, libraryID);
      
      console.log('获取到项目数据，数量:', itemData.length);

      // 为每个项目处理封面
      for (const item of itemData) {
        try {
          console.log('处理项目封面:', item.title || item.citekey);
          
          // 获取附件文件夹路径
          const attachmentFolder = this.coverImageService.getAttachmentFolder(item);
          console.log('附件文件夹:', attachmentFolder);
          
          // 处理封面图片
          const coverImagePath = await this.coverImageService.processZoteroCoverImage(
            item,
            attachmentFolder
          );
          
          if (coverImagePath) {
            console.log('封面图片处理成功:', coverImagePath);
            
            // 更新项目数据中的封面路径
            item.coverImagePath = coverImagePath;
          } else {
            console.log('未找到或处理封面图片失败');
          }
        } catch (error) {
          console.error('处理项目封面时出错:', error);
        }
      }
      
      console.log('封面图片处理完成');
    } catch (error) {
      console.error('处理封面图片时出错:', error);
    }
  }

  /**
   * 处理单个项目的封面图片
   */
  async processItemCoverImage(
    item: any,
    outputFolder: string
  ): Promise<string | null> {
    try {
      const attachmentFolder = this.coverImageService.getAttachmentFolder(item);
      const coverImagePath =
        await this.coverImageService.processZoteroCoverImage(
          item,
          attachmentFolder
        );

      return coverImagePath;
    } catch (error) {
      console.error('处理项目封面图片失败:', error);
      return null;
    }
  }

  /**
   * 在 Markdown 内容中插入封面图片
   */
  insertCoverImageToMarkdown(
    markdown: string,
    coverImagePath: string | null
  ): string {
    return this.coverImageService.insertCoverImageToMarkdown(
      markdown,
      coverImagePath
    );
  }

  /**
   * 更新封面图片服务设置
   */
  updateCoverImageService(settings: ZoteroConnectorSettings): void {
    this.coverImageService.updateSettings(settings);
  }

  // 辅助方法 - 这些方法需要从原始导出模块中导入或重新实现
  private async getCiteKeys(database: any): Promise<any[]> {
    // 这里需要实现获取引用键的逻辑
    // 暂时返回空数组，实际使用时需要从原始模块导入
    return [];
  }

  private async getItemJSONFromCiteKeys(citeKeys: any[], database: any, libraryID: number): Promise<any[]> {
    // 这里需要实现获取项目数据的逻辑
    // 暂时返回空数组，实际使用时需要从原始模块导入
    return [];
  }
}
