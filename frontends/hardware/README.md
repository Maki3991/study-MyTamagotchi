# Reverie 像素小镇 · 板载原生前端(ville_native)

把斯坦福 Generative Agents(AI 小镇)的像素世界,用 **LVGL 原生渲染**在 **Tuya T5AI-Board**(3.5″ 480×320 ILI9488 屏)上跑起来。
**不联网、不接电脑、上电即跑**:地图、角色贴图、两个 AI 居民(Klaus / Isabella)247 步的走动轨迹全部离线烘焙进固件,板子自己循环播放。

---

## 目录结构

```
ville_native/            固件工程(放进 TuyaOpen/examples/multimedia/ 下编译)
├── src/
│   ├── ville_native.c     主渲染逻辑(LVGL:地图平移做相机 + 两个小人插值走动)
│   ├── ville_map.c        地图位图(离线合成的 RGB565 lv_image_dsc,3.6MB C 数组)
│   ├── ville_sprites.c    角色精灵(四方向×三帧走路,ARGB8888)
│   └── ville_track.c      两个角色 247 步的地图像素坐标(int16)
├── include/               上面三份资产的头文件
├── CMakeLists.txt
├── app_default.config     板卡配置(TUYA_T5AI_BOARD + 3.5″ LCD)
└── ville_map_preview.png  地图预览图(直接打开看世界长什么样)

firmware/
└── ville_native_QIO_1.0.0.bin   已编译好的固件,可直接烧录(免编译)

tools/                     离线资产生成脚本(改地图/角色/轨迹时才用)
├── gen_ville_assets.py    从原 Reverie 项目提取并转换成上面的 C 数组
└── render_map.py          Tiled 地图 → 位图 合成
```

---

## 硬件

- 板子:**Tuya T5AI-Board**,屏 **3.5″ 480×320 RGB565(ILI9488)**
- 板卡配置(已写在 `app_default.config`):
  ```
  CONFIG_BOARD_CHOICE_T5AI=y
  CONFIG_BOARD_CHOICE_TUYA_T5AI_BOARD=y
  CONFIG_TUYA_T5AI_BOARD_LCD_35565=y
  ```

---

## 用法 A:直接烧现成固件(最快)

```bash
# 用 TuyaOpen 的 tos.py 或 tyutool 烧 firmware/ville_native_QIO_1.0.0.bin
cd <TuyaOpen>/examples/multimedia/ville_native
tos.py flash -p /dev/cu.usbmodemXXXX
```
> 注意:这块板子有时进不了下载模式。若 flash 超时,先拔 USB → 启动 flash → 再插回 USB,
> 上电瞬间会被抓进下载模式。

**烧完预期**:屏幕显示像素小镇,Klaus 沿预录路线走动、镜头跟随,Isabella 站固定点,顶部显示 `Reverie Ville 步数`,播完循环。

## 用法 B:自己编译

```bash
# 1) 把 ville_native/ 整个目录放到 TuyaOpen/examples/multimedia/ 下
cp -R ville_native <TuyaOpen>/examples/multimedia/

# 2) 编译
cd <TuyaOpen>
export TUYAOPEN_EXPORT_IDE=1
. ./export.sh
cd examples/multimedia/ville_native
tos.py build          # 成功标志:BUILD SUCCESS + Board: TUYA_T5AI_BOARD
tos.py flash -p /dev/cu.usbmodemXXXX
```

---

## 技术方案(一句话)

**离线把原网页项目(Phaser + Tiled)的素材和回放数据"翻译"成 C 数组编进固件,板子用 LVGL 重新画一遍。**
- 地图全程静态 → 离线合成一张 RGB565 大图(10px/tile,700×510),靠平移做相机;
- 角色 = `lv_image`,每 33ms(30fps)按坐标线性插值平滑移动,按前后坐标差自动切朝向/走路帧;
- 数据来自原项目 `compressed_storage/world_visit_demo/master_movement.json`,离线抽成坐标数组。

> ⚠️ flash 分区吃得很紧:地图与代码同在 primary_cp_app(约 1MB 上限),实测占用 ~997KB。
> 想让地图更清晰(调大 `gen_ville_assets.py --tile`)会链接溢出,需改用"瓦片引擎"方案。

---

## 想改内容?

改地图区域 / 角色 / 轨迹,重跑 `tools/gen_ville_assets.py`(需要原 Reverie 项目的素材路径,见脚本顶部常量),会重新生成 `src/ville_map.c / ville_sprites.c / ville_track.c`,再编译即可。

---

## 下一步(可选)：接后端实时驱动

现在是"放录像"。可让板子走 WiFi 从电脑上的桥接程序拉实时坐标 → 变成"活世界的实时窗口"。
数据极小(每步几个字节),渲染逻辑不用改,只需:板子加 WiFi 拉数据 + 电脑写个桥接程序读后端输出。
