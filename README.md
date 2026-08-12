# S3 时刻

南京地铁 S3 下一班查询（兰花塘站牌锚点，任意上下车站）。

## 使用

手机访问：https://subangbang19950406.github.io/train-time/

可「添加到主屏幕」当快捷方式。

本地预览：

```bash
python3 -m http.server 8765
# 打开 http://localhost:8765
```

或直接打开 `index.html`（依赖 `js/data.js`）。

## 改时刻表

编辑 `data/s3-lanhuatang.json` 后同步：

```bash
node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('data/s3-lanhuatang.json')); fs.writeFileSync('js/data.js', 'window.S3_LANHUATANG = '+JSON.stringify(d,null,2)+';');"
```

## 发布前更新版本号（commit 短哈希）

```bash
bash scripts/update-version.sh v1.0.3
```

会生成 `js/version.js`，页面底部显示如 `版本 v1.0.3+1a2b3c4`（并带构建时间）。
