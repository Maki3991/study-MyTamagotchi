/**
 * @file ville_native.c
 * @brief Reverie 像素小镇「板载原生前端」——LVGL v9 原生渲染，非截图推流。
 *
 * 板子上电后：
 *   - 全屏铺一张离线合成的像素小镇地图（agent 活动区，RGB565，编在 flash 里）；
 *   - 两个角色 Klaus / Isabella 按预录轨迹(master_movement.json，编在 flash 里)自动走动；
 *   - 相邻步之间线性插值让走动平滑，按坐标差自动切换朝向与走路帧；
 *   - 相机跟随 Klaus（唯一移动的角色），把当前视口平移到屏幕上。
 *
 * 不联网、不接串口、不推流：所有数据都是离线烘焙进固件的 const 数组。
 *
 * 资产由 tools/gen_ville_assets.py 离线生成：
 *   ville_map.c / ville_sprites.c / ville_track.c
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#include "tuya_cloud_types.h"
#include "tal_api.h"
#include "tkl_output.h"

#include "lvgl.h"
#include "lv_vendor.h"
#include "board_com_api.h"

#include "ville_map.h"
#include "ville_sprites.h"
#include "ville_track.h"

/***********************************************************
************************macro define************************
***********************************************************/
#define TICK_MS         33      /* 动画定时器周期（~30fps） */
#define WALK_FRAME_DIV  5       /* 每几个 tick 换一帧走路动画 */

/***********************************************************
***********************variable define**********************
***********************************************************/
static lv_obj_t   *sg_map_img            = NULL;
static lv_obj_t   *sg_char_img[VILLE_NUM_PERSONA] = {NULL};
static lv_obj_t   *sg_lbl_info           = NULL;

static int         sg_step               = 0;       /* 当前步 0..NUM_STEPS-2 */
static int         sg_progress_num       = 0;       /* 步内进度分子 (0..VILLE_STEP_MS) */
static int         sg_anim_tick          = 0;       /* 全局 tick 计数，用于走路帧 */
static ville_dir_t sg_dir[VILLE_NUM_PERSONA] = {VILLE_DOWN, VILLE_DOWN};

/***********************************************************
***********************function define**********************
***********************************************************/

static inline int __clampi(int v, int lo, int hi)
{
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

/**
 * @brief 根据两步坐标差推朝向（y 向下为正）。dx/dy 全 0 时返回 -1（保持原朝向）。
 */
static int __dir_from_delta(int dx, int dy)
{
    if (dx == 0 && dy == 0) {
        return -1;
    }
    if (abs(dx) >= abs(dy)) {
        return (dx > 0) ? VILLE_RIGHT : VILLE_LEFT;
    }
    return (dy > 0) ? VILLE_DOWN : VILLE_UP;
}

/**
 * @brief 动画主循环：在 LVGL 任务上下文中被周期调用，无需额外加锁。
 */
static void __anim_timer_cb(lv_timer_t *timer)
{
    (void)timer;

    int scr_w = LV_HOR_RES;
    int scr_h = LV_VER_RES;

    /* --- 推进步内进度 / 换步 --- */
    sg_progress_num += TICK_MS;
    while (sg_progress_num >= VILLE_STEP_MS) {
        sg_progress_num -= VILLE_STEP_MS;
        sg_step++;
        if (sg_step >= VILLE_NUM_STEPS - 1) {
            sg_step = 0;            /* 循环回放 */
        }
    }
    sg_anim_tick++;

    int nxt = sg_step + 1;
    if (nxt >= VILLE_NUM_STEPS) {
        nxt = sg_step;
    }

    /* --- 计算每个角色的插值像素坐标（地图坐标系）--- */
    int px[VILLE_NUM_PERSONA], py[VILLE_NUM_PERSONA];
    int moving[VILLE_NUM_PERSONA];
    for (int pi = 0; pi < VILLE_NUM_PERSONA; pi++) {
        int x0 = ville_track_x[pi][sg_step], x1 = ville_track_x[pi][nxt];
        int y0 = ville_track_y[pi][sg_step], y1 = ville_track_y[pi][nxt];
        px[pi] = x0 + (int)((long)(x1 - x0) * sg_progress_num / VILLE_STEP_MS);
        py[pi] = y0 + (int)((long)(y1 - y0) * sg_progress_num / VILLE_STEP_MS);

        int d = __dir_from_delta(x1 - x0, y1 - y0);
        moving[pi] = (d >= 0);
        if (d >= 0) {
            sg_dir[pi] = (ville_dir_t)d;
        }
    }

    /* --- 相机跟随 Klaus (persona 0) --- */
    int cam_x = 0, cam_y = 0;
    if (VILLE_MAP_W > scr_w) {
        cam_x = __clampi(px[0] - scr_w / 2, 0, VILLE_MAP_W - scr_w);
    }
    if (VILLE_MAP_H > scr_h) {
        cam_y = __clampi(py[0] - scr_h / 2, 0, VILLE_MAP_H - scr_h);
    }

    /* --- 平移地图背景 --- */
    lv_obj_set_pos(sg_map_img, -cam_x, -cam_y);

    /* --- 更新两个角色贴图（朝向帧 + 屏幕位置）--- */
    for (int pi = 0; pi < VILLE_NUM_PERSONA; pi++) {
        int frame = moving[pi] ? ((sg_anim_tick / WALK_FRAME_DIV) % VILLE_WALK_FRAMES) : 1;
        lv_image_set_src(sg_char_img[pi], ville_sprite[pi][sg_dir[pi]][frame]);

        int sx = px[pi] - cam_x - VILLE_SPRITE_PX / 2;
        int sy = py[pi] - cam_y - VILLE_SPRITE_PX / 2;
        lv_obj_set_pos(sg_char_img[pi], sx, sy);
    }

    /* --- 顶部状态标签 --- */
    if (sg_lbl_info) {
        lv_label_set_text_fmt(sg_lbl_info, "Reverie Ville  %d/%d", sg_step, VILLE_NUM_STEPS - 1);
    }
}

/**
 * @brief 构建场景：地图背景 + 两个角色 + 状态标签。
 */
static void __build_scene(void)
{
    lv_obj_t *scr = lv_screen_active();
    lv_obj_set_style_bg_color(scr, lv_color_hex(0x4CAF50), LV_PART_MAIN); /* 草地绿 */
    lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, LV_PART_MAIN);

    /* 地图背景（整张大图，靠平移做相机）*/
    sg_map_img = lv_image_create(scr);
    lv_image_set_src(sg_map_img, &ville_map_dsc);
    lv_obj_set_pos(sg_map_img, 0, 0);

    /* 两个角色 */
    for (int pi = 0; pi < VILLE_NUM_PERSONA; pi++) {
        sg_char_img[pi] = lv_image_create(scr);
        lv_image_set_src(sg_char_img[pi], ville_sprite[pi][VILLE_DOWN][1]);
        lv_obj_set_pos(sg_char_img[pi], 0, 0);
    }

    /* 顶部半透明状态标签 */
    sg_lbl_info = lv_label_create(scr);
    lv_obj_set_style_text_color(sg_lbl_info, lv_color_white(), 0);
    lv_obj_set_style_bg_color(sg_lbl_info, lv_color_hex(0x000000), 0);
    lv_obj_set_style_bg_opa(sg_lbl_info, LV_OPA_50, 0);
    lv_obj_set_style_pad_all(sg_lbl_info, 3, 0);
    lv_label_set_text(sg_lbl_info, "Reverie Ville");
    lv_obj_align(sg_lbl_info, LV_ALIGN_TOP_MID, 0, 2);
}

/**
 * @brief Application entry point
 */
void user_main(void)
{
    tal_log_init(TAL_LOG_LEVEL_DEBUG, 4096, (TAL_LOG_OUTPUT_CB)tkl_log_output);

    PR_NOTICE("Application information:");
    PR_NOTICE("Project name:        %s", PROJECT_NAME);
    PR_NOTICE("App version:         %s", PROJECT_VERSION);
    PR_NOTICE("Compile time:        %s", __DATE__);
    PR_NOTICE("TuyaOpen version:    %s", OPEN_VERSION);
    PR_NOTICE("Platform board:      %s", PLATFORM_BOARD);
    PR_NOTICE("Ville map:           %dx%d  steps=%d  sprite=%dpx",
              VILLE_MAP_W, VILLE_MAP_H, VILLE_NUM_STEPS, VILLE_SPRITE_PX);

    board_register_hardware();

    lv_vendor_init(DISPLAY_NAME);

    __build_scene();

    /* 动画定时器：注册后随 LVGL 任务运行，回调在 LVGL 线程内执行 */
    lv_timer_create(__anim_timer_cb, TICK_MS, NULL);

    lv_vendor_start(5, 1024 * 8);
}

#if OPERATING_SYSTEM == SYSTEM_LINUX
void main(int argc, char *argv[])
{
    (void)argc;
    (void)argv;
    user_main();
    while (1) {
        tal_system_sleep(500);
    }
}
#else
static THREAD_HANDLE ty_app_thread = NULL;

static void tuya_app_thread(void *arg)
{
    (void)arg;
    user_main();
    tal_thread_delete(ty_app_thread);
    ty_app_thread = NULL;
}

void tuya_app_main(void)
{
    THREAD_CFG_T thrd_param;
    memset(&thrd_param, 0, sizeof(THREAD_CFG_T));
    thrd_param.stackDepth = 1024 * 4;
    thrd_param.priority   = THREAD_PRIO_1;
    thrd_param.thrdname   = "tuya_app_main";
    tal_thread_create_and_start(&ty_app_thread, NULL, NULL, tuya_app_thread, NULL, &thrd_param);
}
#endif
