import { useState } from 'react'
import { Film, Upload, Download, Scissors, VolumeX, FileVideo } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { useToast } from '../../components/ui/Toast'
import { pickFile } from '../../lib/picker'
import { MEDIA_TABS, MEDIA_USAGE } from '../../config/tools'
import cx from '../../lib/cx'

/*
 * 音视频工具 —— 依据「音视频工具.png」
 *
 * 结构：
 *   1. 三 Tab：提取音频 / 消除原声 / 裁剪音频
 *   2. 上传本地视频（选择文件）+ 尚未选择本地文件。
 *   3. 当前任务状态（后台继续执行的说明）
 *   4. 操作卡：一键提取视频音频为 MP3 + 提取并保存 MP3
 *   5. 使用说明 3 条
 *
 * 数据策略：空状态优先
 */

export default function MediaToolsPage() {
  const [tab, setTab] = useState(MEDIA_TABS[0].id)
  /* 以下为补齐的交互态：已选文件与处理状态 */
  const [file, setFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const { showToast } = useToast()

  const actionText = {
    extract: { title: '一键提取视频音频为 MP3', desc: '保留原音轨内容并导出为独立 MP3 文件。', btn: '提取并保存 MP3' },
    mute: { title: '一键消除视频原声', desc: '移除原视频中的音轨，保留视频画面与原容器格式。', btn: '静音导出并保存' },
    trim: { title: '裁剪音频片段', desc: '按原格式截取片头、片尾或中间片段并保存到本地。', btn: '裁剪并保存' },
  }[tab]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] w-fit">
        {MEDIA_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'press px-5 py-2 rounded-lg text-xs font-black transition-all',
              tab === t.id
                ? 'bg-indigo-500 text-white shadow'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 min-w-0">
          <SectionCard title="上传本地视频" desc="支持常见视频格式，适合一键提取 MP3 或移除原视频中的音轨。">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="glass"
                size="sm"
                onClick={async () => {
                  const f = await pickFile('video/*,audio/*')
                  if (f) setFile(f)
                }}
              >
                <Upload size={13} />
                选择文件
              </Button>
              <span className="text-[11px] text-[var(--text-sub)]">
                {file ? `已选择：${file}` : '尚未选择本地文件。'}
              </span>
            </div>
          </SectionCard>

          <SectionCard title="当前任务状态">
            <p className="mb-3 text-[11px] text-[var(--text-sub)] leading-relaxed">
              当前页会保留已选文件与任务状态；如果后台正在处理，切换到其它页面后仍会继续执行。
            </p>
            <EmptyState
              icon={Film}
              title="暂无进行中的任务"
              desc="选择本地文件后，点击对应按钮即可开始处理并保存到本地。"
            />
          </SectionCard>

          <SectionCard title={actionText.title} desc={actionText.desc}>
            <Button
              variant="primary"
              size="sm"
              icon={ACTION_ICON[tab]}
              disabled={processing}
              onClick={() => {
                if (!file) {
                  showToast('alert', '提示', '请先选择本地媒体文件')
                  return
                }
                /*
                 * 音视频转码/抽帧/压缩需要后端调用 ffmpeg，
                 * 纯前端无法真实完成，因此明确告知，不假装处理成功。
                 */
                showToast(
                  'alert',
                  '需要后端',
                  `${actionText.btn}需要后端调用 ffmpeg 处理媒体文件，当前为纯前端预览，未真实处理。`
                )
              }}
            >
              {processing ? '处理中...' : actionText.btn}
            </Button>
          </SectionCard>
        </div>

        <SectionCard title="使用说明">
          <ul className="space-y-2.5">
            {MEDIA_USAGE.map((u) => (
              <li key={u} className="flex gap-2 text-[11px] text-[var(--text-sub)] leading-relaxed">
                <FileVideo size={12} className="shrink-0 mt-0.5 text-indigo-500" />
                {u}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}

/* 三个子功能对应的操作图标 */
const ACTION_ICON = { extract: Download, mute: VolumeX, trim: Scissors }
