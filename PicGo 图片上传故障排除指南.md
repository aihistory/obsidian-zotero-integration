# PicGo 图片上传故障排除指南

## 问题诊断

根据错误信息 "Not sending data in JSON format"，PicGo 期望接收 JSON 格式的数据，而不是 multipart/form-data。

## 解决方案

### 1. 确保 PicGo 应用正在运行

1. **下载并安装 PicGo**
   - 访问 [PicGo 官方仓库](https://github.com/Molunerfinn/PicGo/releases)
   - 下载适合您系统的版本
   - 安装并启动 PicGo

2. **配置 PicGo 设置**
   - 打开 PicGo 应用
   - 进入设置页面
   - 确保 "Server" 选项已启用
   - 确认端口设置为 `36677`

### 2. 验证 PicGo 服务器状态

在终端中运行以下命令检查服务器是否运行：

```bash
curl http://127.0.0.1:36677/upload
```

如果返回连接被拒绝，说明 PicGo 服务器未运行。

### 3. 配置图床

在 PicGo 中配置您想要使用的图床：
- GitHub
- Gitee
- 阿里云 OSS
- 腾讯云 COS
- 七牛云
- 等等

### 4. 插件设置检查

确保插件设置中的以下配置正确：

- **默认上传器**: 选择 "PicGo"
- **PicGo server 上传接口**: `http://127.0.0.1:36677/upload`
- **PicGo server 删除接口**: `http://127.0.0.1:36677/delete`
- **启用图片上传功能**: 开启

### 5. API 格式说明

PicGo 期望接收 JSON 格式的数据：

```json
{
  "list": [
    {
      "path": "filename.jpg",
      "data": "base64-encoded-image-data"
    }
  ]
}
```

**重要**: 不要使用 multipart/form-data 格式，必须使用 JSON 格式。

### 6. 常见问题

#### 问题 1: "Not sending data in JSON format"
**原因**: 使用了错误的请求格式
**解决**: 使用 JSON 格式发送数据，包含 base64 编码的图片数据

#### 问题 2: 连接被拒绝
**原因**: PicGo 应用未运行或端口配置错误
**解决**: 启动 PicGo 并检查端口设置

#### 问题 3: 上传失败但服务器运行正常
**原因**: 图床配置错误或网络问题
**解决**: 检查图床配置和网络连接

#### 问题 4: 权限问题
**原因**: 图床 API 密钥配置错误
**解决**: 重新配置图床的 API 密钥

### 7. 调试步骤

1. 打开浏览器开发者工具
2. 尝试上传图片
3. 查看控制台输出的详细错误信息
4. 检查网络请求的详细信息

### 8. 替代方案

如果 PicGo 配置困难，可以考虑：
- 使用其他图片上传服务
- 手动上传到图床
- 使用云存储服务

## 联系支持

如果问题仍然存在，请：
1. 检查 PicGo 的日志信息
2. 确认图床配置正确
3. 提供详细的错误信息 