import Fuse from 'fuse.js';
import { EditableFileView, Events, Plugin, TFile, Notice } from 'obsidian';
import { shellPath } from 'shell-path';

import { DataExplorerView, viewType } from './DataExplorerView';
import { LoadingModal } from './bbt/LoadingModal';
import { getCAYW } from './bbt/cayw';
import { exportToMarkdown, renderCiteTemplate } from './bbt/export';
import {
  filesFromNotes,
  insertNotesIntoCurrentDoc,
  noteExportPrompt,
} from './bbt/exportNotes';
import './bbt/template.helpers';
import { CoverImageService } from './services/CoverImageService';
import {
  currentVersion,
  downloadAndExtract,
  internalVersion,
} from './settings/AssetDownloader';
import { ZoteroConnectorTabbedSettingsTab } from './settings/TabbedSettings';
import {
  CitationFormat,
  CiteKeyExport,
  ExportFormat,
  ZoteroConnectorSettings,
} from './types';

const commandPrefix = 'obsidian-zotero-desktop-connector:';
const citationCommandIDPrefix = 'zdc-';
const exportCommandIDPrefix = 'zdc-exp-';
const DEFAULT_SETTINGS: ZoteroConnectorSettings = {
  database: 'Zotero',
  noteImportFolder: '',
  pdfExportImageDPI: 120,
  pdfExportImageFormat: 'jpg',
  pdfExportImageQuality: 90,
  citeFormats: [],
  exportFormats: [],
  citeSuggestTemplate: '[[{{citekey}}]]',
  openNoteAfterImport: false,
  whichNotesToOpenAfterImport: 'first-imported-note',

  // 封面相关默认设置
  cacheImage: true,
  cacheHighQuantityImage: true,
  attachmentPath: 'assets',
  pictureBedFlag: false,
  pictureBedType: 'PicGo',
  pictureBedSetting: {
    url: 'http://127.0.0.1:36677/upload',
  },
};

async function fixPath() {
  if (process.platform === 'win32') {
    return;
  }

  try {
    const path = await shellPath();

    process.env.PATH =
      path ||
      [
        './node_modules/.bin',
        '/.nodebrew/current/bin',
        '/usr/local/bin',
        process.env.PATH,
      ].join(':');
  } catch (e) {
    console.error(e);
  }
}

export default class ZoteroConnector extends Plugin {
  settings: ZoteroConnectorSettings;
  emitter: Events;
  fuse: Fuse<CiteKeyExport>;
  coverImageService: CoverImageService;

  async onload() {
    await this.loadSettings();
    this.emitter = new Events();

    // 初始化封面图片服务
    this.coverImageService = new CoverImageService(
      this.settings,
      this.app.vault
    );

    this.updatePDFUtility();
    this.addSettingTab(new ZoteroConnectorTabbedSettingsTab(this.app, this));
    this.registerView(viewType, (leaf) => new DataExplorerView(this, leaf));

    this.settings.citeFormats.forEach((f) => {
      this.addFormatCommand(f);
    });

    this.settings.exportFormats.forEach((f) => {
      this.addExportCommand(f);
    });

    this.addCommand({
      id: 'zdc-insert-notes',
      name: 'Insert notes into current document',
      editorCallback: (editor) => {
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        noteExportPrompt(
          database,
          this.app.workspace.getActiveFile()?.parent.path
        ).then((notes) => {
          if (notes) {
            insertNotesIntoCurrentDoc(editor, notes);
          }
        });
      },
    });

    this.addCommand({
      id: 'zdc-import-notes',
      name: 'Import notes',
      callback: () => {
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        noteExportPrompt(database, this.settings.noteImportFolder)
          .then((notes) => {
            if (notes) {
              return filesFromNotes(this.settings.noteImportFolder, notes);
            }
            return [] as string[];
          })
          .then((notes) => this.openNotes(notes));
      },
    });

    this.addCommand({
      id: 'show-zotero-debug-view',
      name: 'Data explorer',
      callback: () => {
        this.activateDataExplorer();
      },
    });

    // 添加测试封面下载功能的命令
    this.addCommand({
      id: 'test-cover-download',
      name: 'Test cover image download',
      callback: async () => {
        console.log('开始测试封面下载功能...');
        
                 // 测试项目数据
         const testItem = {
           citekey: 'test2024',
           title: '测试书籍',
           itemType: 'book',
           coverImage: 'https://img2.doubanio.com/view/subject/s/public/s29651121.jpg',
           attachments: [
             {
               path: 'test-cover.jpg',
               url: 'https://img2.doubanio.com/view/subject/s/public/s29651121.jpg',
               contentType: 'image/jpeg'
             }
           ]
         };
        
        try {
          // 获取附件文件夹路径
          const attachmentFolder = this.coverImageService.getAttachmentFolder(testItem);
          console.log('附件文件夹:', attachmentFolder);
          
          // 处理封面图片
          const coverImagePath = await this.coverImageService.processZoteroCoverImage(
            testItem,
            attachmentFolder
          );
          
          if (coverImagePath) {
            console.log('✅ 封面图片处理成功！');
            console.log('封面路径:', coverImagePath);
            new Notice('封面图片下载成功！');
          } else {
            console.log('❌ 封面图片处理失败！');
            new Notice('封面图片下载失败！');
          }
        } catch (error) {
          console.error('封面下载测试失败:', error);
          new Notice('封面下载测试失败: ' + error.message);
        }
      },
    });

    // 添加测试 PicGo 连接的命令
    this.addCommand({
      id: 'test-picgo-connection',
      name: 'Test PicGo connection',
      callback: async () => {
        console.log('开始测试 PicGo 连接...');
        
        const url = this.settings.pictureBedSetting?.url || '未配置';
        console.log('PicGo 配置 URL:', url);
        
        if (!url || url === '未配置') {
          new Notice('❌ PicGo URL 未配置，请在设置中配置 PicGo 上传 URL');
          return;
        }
        
        try {
          // 创建临时的 ImageHandler 来测试连接
          const { ImageHandler } = await import('./utils/ImageHandler');
          const imageHandler = new ImageHandler(this.settings, this.app.vault);
          
          new Notice('正在测试 PicGo 连接，请稍候...', 3000);
          
          // 检查连接
          const isConnected = await imageHandler.checkPicGoConnection();
          
          if (isConnected) {
            console.log('✅ PicGo 连接测试成功！');
            new Notice('✅ PicGo 连接成功！可以正常上传图片到图床。', 5000);
          } else {
            console.log('❌ PicGo 连接测试失败！');
            new Notice(`❌ PicGo 连接失败！\n\n配置的 URL: ${url}\n\n请检查：\n1. PicGo 应用是否已启动\n2. PicGo Server 插件是否已启用\n3. 端口配置是否正确\n4. 防火墙是否允许访问该端口`, 10000);
          }
        } catch (error) {
          console.error('PicGo 连接测试异常:', error);
          new Notice('❌ PicGo 连接测试异常: ' + error.message, 8000);
        }
      },
    });

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile) {
          this.emitter.trigger('fileUpdated', file);
        }
      })
    );

    app.workspace.trigger('parse-style-settings');

    fixPath();
  }

  onunload() {
    this.settings.citeFormats.forEach((f) => {
      this.removeFormatCommand(f);
    });

    this.settings.exportFormats.forEach((f) => {
      this.removeExportCommand(f);
    });

    this.app.workspace.detachLeavesOfType(viewType);
  }

  addFormatCommand(format: CitationFormat) {
    this.addCommand({
      id: `${citationCommandIDPrefix}${format.name}`,
      name: format.name,
      editorCallback: (editor) => {
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        if (format.format === 'template' && format.template.trim()) {
          renderCiteTemplate({
            database,
            format,
          }).then((res) => {
            if (typeof res === 'string') {
              editor.replaceSelection(res);
            }
          });
        } else {
          getCAYW(format, database).then((res) => {
            if (typeof res === 'string') {
              editor.replaceSelection(res);
            }
          });
        }
      },
    });
  }

  removeFormatCommand(format: CitationFormat) {
    (this.app as any).commands.removeCommand(
      `${commandPrefix}${citationCommandIDPrefix}${format.name}`
    );
  }

  addExportCommand(format: ExportFormat) {
    this.addCommand({
      id: `${exportCommandIDPrefix}${format.name}`,
      name: format.name,
      callback: async () => {
        const database = {
          database: this.settings.database,
          port: this.settings.port,
        };
        
        // 使用带封面处理的导出功能
        const markdownFiles = await this.exportToMarkdownWithCoverImages({
          settings: this.settings,
          database,
          exportFormat: format,
        });
        
        this.openNotes(markdownFiles);
      },
    });
  }

  removeExportCommand(format: ExportFormat) {
    (this.app as any).commands.removeCommand(
      `${commandPrefix}${exportCommandIDPrefix}${format.name}`
    );
  }

  async runImport(name: string, citekey: string, library: number = 1) {
    const format = this.settings.exportFormats.find((f) => f.name === name);

    if (!format) {
      throw new Error(`Error: Import format "${name}" not found`);
    }

    const database = {
      database: this.settings.database,
      port: this.settings.port,
    };

    if (citekey.startsWith('@')) citekey = citekey.substring(1);

    // 使用带封面处理的导出功能
    await this.exportToMarkdownWithCoverImages(
      {
        settings: this.settings,
        database,
        exportFormat: format,
      },
      [{ key: citekey, library }]
    );
  }

  /**
   * 扩展的导出功能，包含封面图片处理
   */
  async exportToMarkdownWithCoverImages(
    params: any,
    explicitCiteKeys?: any[]
  ): Promise<string[]> {
    console.log('开始导出，包含封面图片处理');
    
    // 如果启用了封面图片功能，我们需要同时获取项目数据来处理封面
    if (this.coverImageService.shouldProcessCoverImage()) {
      console.log('封面图片功能已启用，使用扩展导出流程');
      return await this.exportToMarkdownWithCoverImagesExtended(params, explicitCiteKeys);
    } else {
      console.log('封面图片功能未启用，使用标准导出');
      return await exportToMarkdown(params, explicitCiteKeys);
    }
  }

  /**
   * 扩展的导出功能，同时处理 Markdown 导出和封面图片
   */
  private async exportToMarkdownWithCoverImagesExtended(
    params: any,
    explicitCiteKeys?: any[]
  ): Promise<string[]> {
    try {
      // 导入必要的函数
      const { getCiteKeys } = await import('./bbt/cayw');
      const { getItemJSONFromCiteKeys } = await import('./bbt/jsonRPC');
      
      const { database } = params;
      
      // 获取 citeKeys（只调用一次）
      const citeKeys = explicitCiteKeys || await getCiteKeys(database);
      if (!citeKeys.length) {
        console.log('没有找到引用键');
        return [];
      }

      console.log('获取到引用键:', citeKeys);
      const libraryID = citeKeys[0].library;
      
      // 获取项目数据
      const itemData = await getItemJSONFromCiteKeys(citeKeys, database, libraryID);
      if (!itemData.length) {
        console.log('没有找到项目数据');
        return [];
      }

      console.log('获取到项目数据，数量:', itemData.length);

      // 先处理封面图片，再导出 Markdown
      console.log('🔄 先处理封面图片...');
      await this.processCoverImagesForItems(itemData);
      
      console.log('🔄 封面处理完成，开始导出 Markdown...');
      console.log('📖 传递预处理的 itemData 到 exportToMarkdown');
      const markdownFiles = await exportToMarkdown(params, citeKeys, itemData);

      console.log('✅ 导出和封面处理完成');
      return markdownFiles;

    } catch (error) {
      console.error('❌ 扩展导出过程中出错:', error);
      // 降级到标准导出
      return await exportToMarkdown(params, explicitCiteKeys);
    }
  }

  /**
   * 为项目数据处理封面图片
   */
  private async processCoverImagesForItems(itemData: any[]): Promise<void> {
    console.log('开始处理项目封面，数量:', itemData.length);
    
    for (const item of itemData) {
      try {
        console.log('处理项目封面:', item.title || item.citekey);
        
        // 获取附件文件夹路径
        const attachmentFolder = this.coverImageService.getAttachmentFolder(item);
        
        // 处理封面图片
        const coverImagePath = await this.coverImageService.processZoteroCoverImage(
          item,
          attachmentFolder
        );
        
        if (coverImagePath) {
          console.log('✅ 封面图片处理成功:', coverImagePath);
          item.coverImagePath = coverImagePath;
        } else {
          console.log('❌ 未找到或处理封面图片失败');
        }
      } catch (itemError) {
        console.error('❌ 处理项目封面时出错:', itemError);
      }
    }
    
    console.log('✅ 所有项目封面处理完成');
  }



  async openNotes(createdOrUpdatedMarkdownFilesPaths: string[]) {
    const pathOfNotesToOpen: string[] = [];
    if (this.settings.openNoteAfterImport) {
      // Depending on the choice, retreive the paths of the first, the last or all imported notes
      switch (this.settings.whichNotesToOpenAfterImport) {
        case 'first-imported-note': {
          pathOfNotesToOpen.push(createdOrUpdatedMarkdownFilesPaths[0]);
          break;
        }
        case 'last-imported-note': {
          pathOfNotesToOpen.push(
            createdOrUpdatedMarkdownFilesPaths[
              createdOrUpdatedMarkdownFilesPaths.length - 1
            ]
          );
          break;
        }
        case 'all-imported-notes': {
          pathOfNotesToOpen.push(...createdOrUpdatedMarkdownFilesPaths);
          break;
        }
      }
    }

    // Force a 1s delay after importing the files to make sure that notes are created before attempting to open them.
    // A better solution could surely be found to refresh the vault, but I am not sure how to proceed!
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const leaves = this.app.workspace.getLeavesOfType('markdown');
    for (const path of pathOfNotesToOpen) {
      const note = this.app.vault.getAbstractFileByPath(path);
      const open = leaves.find(
        (leaf) => (leaf.view as EditableFileView).file === note
      );
      if (open) {
        app.workspace.revealLeaf(open);
      } else if (note instanceof TFile) {
        await this.app.workspace.getLeaf(true).openFile(note);
      }
    }
  }

  async loadSettings() {
    const loadedSettings = await this.loadData();

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loadedSettings,
    };
  }

  async saveSettings() {
    this.emitter.trigger('settingsUpdated');
    // 更新封面图片服务的设置
    this.coverImageService.updateSettings(this.settings);
    await this.saveData(this.settings);
  }

  deactivateDataExplorer() {
    this.app.workspace.detachLeavesOfType(viewType);
  }

  async activateDataExplorer() {
    this.deactivateDataExplorer();
    const leaf = this.app.workspace.createLeafBySplit(
      this.app.workspace.activeLeaf,
      'vertical'
    );

    await leaf.setViewState({
      type: viewType,
    });
  }

  async updatePDFUtility() {
    const { exeOverridePath, _exeInternalVersion, exeVersion } = this.settings;
    if (exeOverridePath || !exeVersion) return;

    if (
      exeVersion !== currentVersion ||
      !_exeInternalVersion ||
      _exeInternalVersion !== internalVersion
    ) {
      const modal = new LoadingModal(
        app,
        'Updating Obsidian Zotero Integration PDF Utility...'
      );
      modal.open();

      try {
        const success = await downloadAndExtract();

        if (success) {
          this.settings.exeVersion = currentVersion;
          this.settings._exeInternalVersion = internalVersion;
          this.saveSettings();
        }
      } catch {
        //
      }

      modal.close();
    }
  }
}
