# ville_native —— Reverie 像素小镇「板载原生前端」

在 Tuya **T5AI-Board**（3.5 寸 320×480 RGB565 / ILI9488）上，用 **LVGL v9 原生渲染**
Reverie 生成式小镇，并让两个角色按预录轨迹自动走动。**不是截图推流** —— 地图、角色精灵、
移动轨迹全部离线烘焙成 `const` 数组编进固件，板子上电即自播放，**不联网、不接串口**。

## 屏幕上会看到什么

- 全屏铺一张像素小镇地图（Reverie `the_ville` 的 agent 活动区，tile x∈[58,127] y∈[14,64]）。
- 两个角色 **Klaus Mueller** 与 **Isabella Rodriguez** 按 `master_movement.json`（247 步）走动：
  - 相邻步之间线性插值，走动平滑；按坐标差自动切朝向（上/下/左/右）+ 3 帧走路动画。
  - **相机跟随 Klaus**（唯一移动的角色；Isabella 全程停在 tile [73,14]）。视口平移把 Klaus 保持在屏幕中心附近。
- 顶部有一个半透明状态标签 `Reverie Ville  step/总步数`，播完循环重播。

## 目录结构

```
ville_native/
├── app_default.config      # 板卡/LVGL 配置（TUYA_T5AI_BOARD + 3.5" 35565 + LVGL v9）
├── CMakeLists.txt
├── include/                # 自动生成的资产头文件
│   ├── ville_map.h         #   地图尺寸/tile/区域原点
│   ├── ville_sprites.h     #   角色精灵表 [persona][dir][frame]
│   └── ville_track.h       #   步数/每步时长/轨迹声明
├── src/
│   ├── ville_native.c      # 主逻辑（唯一手写文件）：建场景 + 动画定时器 + 相机
│   ├── ville_map.c         # 自动生成：地图 RGB565 位图（700×510，约 714 KB）
│   ├── ville_sprites.c     # 自动生成：两角色 4 方向×3 帧 ARGB8888 精灵
│   └── ville_track.c       # 自动生成：两角色每步地图像素坐标（int16）
└── ville_map_preview.png   # 离线预览图（缩放后地图肉眼确认用，不进固件）
```

## 离线资产管线（电脑侧）

资产由 `<repo>/tools/gen_ville_assets.py` 生成（用主任务的 `castvenv` Python，已装 Pillow）：

```bash
cd /Users/mychanging/Desktop/AdventureX
castvenv/bin/python tools/gen_ville_assets.py --tile 10          # 生成全部资产（默认）
castvenv/bin/python tools/gen_ville_assets.py --tile 10 --preview # 额外导出预览 PNG
castvenv/bin/python tools/gen_ville_assets.py --step-ms 600       # 调每步毫秒(默认600，越小走得越快)
```

生成脚本会直接覆写本工程的 `src/ville_*.c` 与 `include/ville_*.h`。

> **flash 预算提醒**：地图 RGB565 位图与代码同处 `primary_cp_app` 分区，实测该分区
> 上限 **1 MB**（链接日志 `cp size 997536, limit 1048576`），10px/tile 的 714 KB 地图
> 用掉后仅剩约 51 KB 余量。**不要把 `--tile` 调到 12 或更大**，否则 cp 分区溢出、链接失败。
> 想要更大角色，应改成「相机跟随 + 瓦片引擎实时贴图」而不是加大整图分辨率（见下方"后续增强"）。

## 编译

在 SDK 根目录：

```bash
cd /Users/mychanging/Desktop/AdventureX/TuyaOpen
export TUYAOPEN_EXPORT_IDE=1 && . ./export.sh
cd examples/multimedia/ville_native
tos.py build
```

编译成功标志（已验证）：

```
====================[ BUILD SUCCESS ]===================
 Target    : ville_native_QIO_1.0.0.bin
 Board     : TUYA_T5AI_BOARD
========================================================
```

## 烧录（由主任务协调执行 —— 本工程开发时未占用串口）

> ⚠️ 现场只有一块开发板，USB 口可能被并行任务占用。**确认串口空闲后**再烧录。

```bash
cd /Users/mychanging/Desktop/AdventureX/TuyaOpen/examples/multimedia/ville_native
# 查串口（macOS 通常是 /dev/cu.usbmodem* 或 /dev/cu.usbserial*）
ls /dev/cu.*
# 烧录（按板子说明，可能需要先按住 boot 键上电进下载模式）
tos.py flash -p /dev/cu.usbmodemXXXX
```

产物位于 `dist/ville_native_1.0.0/`：
- `ville_native_QIO_1.0.0.bin` —— 整片 flash 镜像（首次/整片烧录用）
- `ville_native_UA_1.0.0.bin`  —— UART 下载镜像
- `ville_native_UG_1.0.0.bin`  —— OTA 升级镜像

烧录并复位后，屏幕应显示像素小镇，Klaus 沿预录路线在镇里走动、相机跟随，Isabella 停在其固定位置。

## 实现要点（`ville_native.c`）

- 用 LVGL 合成器而非手动画布 blit：一个 `lv_image`（整张地图 `const` dsc）靠 `lv_obj_set_pos(-cam_x,-cam_y)` 平移做相机；两个 `lv_image` 做角色，每帧 `lv_image_set_src()` 换朝向/走路帧并 `lv_obj_set_pos()` 定位。地图只有可见区域被重绘，无需运行时大缓冲。
- 动画由 `lv_timer_create(cb, 33ms, ...)` 驱动（~30fps），回调在 LVGL 任务内执行，天然线程安全。
- 每步进度按 `TICK_MS / VILLE_STEP_MS` 累加，跨步做线性插值；朝向取坐标差的主轴（y 向下为正）。
- 相机夹取到 `[0, MAP_W-屏宽] × [0, MAP_H-屏高]`，跟随 Klaus（persona 0）。

## 后续增强（未做）

- **中文描述气泡 / emoji `pronunciatio`**：`master_movement.json` 每步含中文 `description` 与 emoji，
  需引入中文字体 + emoji 图集，本 MVP 按要求跳过。
- **瓦片引擎**：改存"tileset 图集 + tile 索引网格"，运行时按相机实时贴 32px 原生瓦片，可让角色更大且省 flash。
- **触摸交互**：板子支持 GT1151 触摸，可加点击角色查看信息等。
