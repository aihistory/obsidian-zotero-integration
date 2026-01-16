# Cursor Rules 配置说明

本项目包含自定义的 Cursor rules，用于规范开发环境和代码风格。

## 规则文件列表

### 1. `nodejs-environment.mdc`
**Node.js 环境配置规则**
- Node.js 版本管理 (nvm)
- 项目构建配置
- 开发工具配置
- 常见问题解决方案
- 环境变量设置

### 2. `typescript-development.mdc`
**TypeScript 开发规范**
- 类型定义规范
- 函数定义规范
- 类定义规范
- 代码风格指南
- 最佳实践

## 使用方法

### 在 Cursor 中启用规则

1. 打开 Cursor 设置
2. 找到 "Rules" 或 "Cursor Rules" 部分
3. 添加以下规则文件路径：
   ```
   .cursor/rules/nodejs-environment.mdc
   .cursor/rules/typescript-development.mdc
   ```

### 在项目中使用

这些规则会在您编写代码时自动应用，提供：
- 代码补全建议
- 错误检查
- 格式化指导
- 最佳实践提示

## 环境设置

### 快速环境配置

```bash
# 1. 加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. 切换到 Node.js 20
nvm use v20.19.4

# 3. 验证环境
node --version  # 应该显示 v20.19.4
npm --version   # 应该显示 10.8.2
```

### 项目构建

```bash
# 安装依赖
npm install

# 类型检查
npm run check-types

# 代码格式化
npm run prettier

# 构建项目
npm run build
```

## 规则更新

当项目环境或配置发生变化时，请及时更新相应的规则文件：

1. **环境变化**: 更新 `nodejs-environment.mdc`
2. **代码规范变化**: 更新 `typescript-development.mdc`
3. **新增功能**: 创建新的规则文件

## 故障排除

### 规则不生效
- 检查规则文件路径是否正确
- 确认 Cursor 已重新加载规则
- 查看 Cursor 控制台是否有错误信息

### 环境问题
- 参考 `nodejs-environment.mdc` 中的故障排除部分
- 检查 Node.js 版本是否正确
- 验证依赖是否正确安装

## 贡献指南

如果您想改进这些规则：

1. 编辑相应的 `.mdc` 文件
2. 测试规则是否正常工作
3. 提交更改并说明修改内容

## 相关文档

- [Cursor Rules 官方文档](https://cursor.sh/docs/rules)
- [Node.js 官方文档](https://nodejs.org/docs)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs)
- [Obsidian 插件开发文档](https://docs.obsidian.md/Home)

---

**最后更新**: 2024-08-17
**维护者**: AI Assistant
