import { Setting } from 'obsidian';
import React from 'react';

import { PictureBedType, ZoteroConnectorSettings } from '../types';
import { SettingItem } from './SettingItem';

interface CoverImageSettingsProps {
  settings: ZoteroConnectorSettings;
  updateSetting: (key: keyof ZoteroConnectorSettings, value: any) => void;
}

export function CoverImageSettings({
  settings,
  updateSetting,
}: CoverImageSettingsProps) {
  const [showPicGoSettings, setShowPicGoSettings] = React.useState(
    settings.pictureBedFlag
  );

  React.useEffect(() => {
    setShowPicGoSettings(settings.pictureBedFlag);
  }, [settings.pictureBedFlag]);

  return (
    <div className="zt-cover-image-settings">

      {/* 保存图片附件 */}
      <SettingItem
        name="保存图片附件"
        description="导入数据会同步保存图片附件到本地文件夹，如电影封面、书籍封面。如果需要显示封面，请保持开启该功能。"
      >
        <input
          type="checkbox"
          checked={settings.cacheImage || false}
          onChange={(e) =>
            updateSetting('cacheImage', (e.target as HTMLInputElement).checked)
          }
        />
      </SettingItem>

      {settings.cacheImage && (
        <>
          {/* 使用附件图床 */}
          <SettingItem
            name="使用附件图床"
            description="开启此选项将会把导入的封面文件上传图床，而不是保存在本地"
          >
            <input
              type="checkbox"
              checked={settings.pictureBedFlag || false}
              onChange={(e) =>
                updateSetting(
                  'pictureBedFlag',
                  (e.target as HTMLInputElement).checked
                )
              }
            />
          </SettingItem>

          {showPicGoSettings && (
            <>
              {/* 选择图床类型 */}
              <SettingItem name="选择图床类型" description="选择使用的图床服务">
                <select
                  value={settings.pictureBedType || PictureBedType.PicGo}
                  onChange={(e) =>
                    updateSetting(
                      'pictureBedType',
                      (e.target as HTMLSelectElement).value
                    )
                  }
                >
                  <option value={PictureBedType.PicGo}>PicGo</option>
                </select>
              </SettingItem>

              {/* PicGo 上传 URL */}
              <SettingItem
                name="PicGo上传Url"
                description="PicGo 服务的上传地址"
              >
                <input
                  type="text"
                  value={
                    settings.pictureBedSetting?.url ||
                    'http://127.0.0.1:36677/upload'
                  }
                  onChange={(e) =>
                    updateSetting('pictureBedSetting', {
                      ...settings.pictureBedSetting,
                      url: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder="http://127.0.0.1:36677/upload"
                />
              </SettingItem>
            </>
          )}

          {!showPicGoSettings && (
            <>
              {/* 附件存放位置 */}
              <SettingItem
                name="附件存放位置"
                description="保存的附件将会存放至该文件夹中。如果为空，笔记将会存放到默认位置(assets)，且支持所有'通用'的参数。如：{{myType}}/attachments"
              >
                <input
                  type="text"
                  value={settings.attachmentPath || 'assets'}
                  onChange={(e) =>
                    updateSetting(
                      'attachmentPath',
                      (e.target as HTMLInputElement).value
                    )
                  }
                  placeholder="assets"
                />
              </SettingItem>
            </>
          )}

          {/* 保存高清封面 */}
          <SettingItem
            name="保存高清封面"
            description="高清封面图片质量更高清晰度更好，需要您在此插件登录豆瓣才能生效，若未登录则默认使用低精度版本封面"
          >
            <input
              type="checkbox"
              checked={settings.cacheHighQuantityImage || false}
              onChange={(e) =>
                updateSetting(
                  'cacheHighQuantityImage',
                  (e.target as HTMLInputElement).checked
                )
              }
            />
          </SettingItem>
        </>
      )}
    </div>
  );
}
