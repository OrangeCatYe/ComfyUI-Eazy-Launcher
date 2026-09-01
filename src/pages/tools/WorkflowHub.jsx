import { useState } from 'react'
import { scanFilesDirectory, WORKFLOW_EXTS } from '../../lib/envScan'
import { Workflow, RefreshCw, Rocket, MapPin, ChevronRight, FileJson } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'
import { useToast } from '../../components/ui/Toast'

/*
 * 工作流管家 —— 依据「工作流管家.png」
 *
 * 结构：
 *   1. 顶部：刷新列表 | 全选 | 快捷搜索工作流名称
 *   2. 计数：当前显示 N 条工作流
 *   3. 工作流列表条目：文件名 + 定位
 *   4. 底部：启动所选工作流（已选 0/N）+ 启动分析
 *      （预计加载插件 0 | 未识别节点 0）+ 未识别节点明细 > + 临时禁用插件列表 >
 *
 * 数据策略：空状态优先
 */

export default function WorkflowHubPage() {
  const [keyword, setKeyword] = useState('')
  /* 以下为补齐的交互态：工作流列表与选中项 */
  const [workflows, setWorkflows] = useState([])
  const [selected, setSelected] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const { showToast } = useToast()

  const selectedNames = workflows.filter((w) => selected[w.name]).map((w) => w.name)

  /* 过滤后的列表（受搜索词影响） */
  const list = keyword.trim()
    ? workflows.filter((w) => w.name.toLowerCase().includes(keyword.toLowerCase()))
    : workflows

  /*
   * 刷新列表：真实读取用户选择的目录中的工作流文件
   */
  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await scanFilesDirectory(WORKFLOW_EXTS)
      if (!res) return
      if (!res.ok) {
        showToast('alert', '读取失败', res.reason || '无法读取该目录。')
        return
      }
      setWorkflows(
        res.files.map((f) => ({
          name: f.name,
          size: f.size,
          path: f.path,
        }))
      )
      showToast(
        'success',
        '读取完成',
        `已从「${res.dir}」真实读取到 ${res.files.length} 个工作流文件。`
      )
    } catch (e) {
      showToast('alert', '读取失败', e?.message || '读取目录时发生错误。')
    } finally {
      setRefreshing(false)
    }
  }

  /* 启动所选工作流：需要后端拉起 ComfyUI 并加载工作流 */
  function handleLaunch() {
    if (selectedNames.length === 0) {
      showToast('alert', '提示', '请先选择要启动的工作流')
      return
    }
    showToast(
      'alert',
      '需要后端',
      `启动工作流需要后端拉起 ComfyUI 并加载文件，当前为纯前端预览，未真实启动已选的 ${selectedNames.length} 个工作流。`
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="glass" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '读取中...' : '刷新列表'}
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={() => {
            if (workflows.length === 0) {
              showToast('alert', '提示', '暂无工作流可勾选')
              return
            }
            const all = {}
            const shouldSelect = selectedNames.length !== workflows.length
            if (shouldSelect) workflows.forEach((w) => (all[w.name] = true))
            setSelected(all)
          }}
        >
          {selectedNames.length === workflows.length && workflows.length > 0 ? '取消全选' : '全选'}
        </Button>
        <div className="ml-auto w-full sm:w-72">
          <SearchInput value={keyword} onChange={setKeyword} placeholder="快捷搜索工作流名称..." />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* 工作流列表 */}
        <section className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[0_2px_12px_var(--shadow-color)] min-w-0">
          <div className="px-5 py-3 border-b border-[var(--border-main)]">
            <span className="text-[11px] font-black text-[var(--text-sub)]">
              当前显示 <span className="tnum text-[var(--text-main)]">{list.length}</span> 条工作流
            </span>
          </div>

          <div className="px-5 py-4">
            {list.length === 0 ? (
              <EmptyState
                icon={FileJson}
                title={keyword ? '未找到匹配的工作流' : '暂无工作流'}
                desc={
                  keyword
                    ? '试试更换关键词，或清空搜索条件。'
                    : '点击左上角「刷新列表」，选择一个包含工作流 JSON 的文件夹即可真实读取。'
                }
                action={
                  keyword ? undefined : (
                    <Button variant="primary" size="sm" onClick={handleRefresh} disabled={refreshing}>
                      <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                      选择工作流目录
                    </Button>
                  )
                }
              />
            ) : (
              <div className="space-y-1">
                {list.map((w) => (
                  <label
                    key={w.name}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] cursor-pointer hover:bg-[var(--bg-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selected[w.name])}
                      onChange={() => setSelected((s) => ({ ...s, [w.name]: !s[w.name] }))}
                      className="accent-indigo-500 shrink-0"
                    />
                    <FileJson size={12} className="text-[var(--text-sub)] shrink-0" />
                    <span className="text-[11px] font-black text-[var(--text-main)] truncate">
                      {w.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 启动与分析 */}
        <div className="space-y-4">
          <SectionCard>
            <div className="space-y-3">
              <Button variant="primary" size="md" className="w-full" onClick={handleLaunch}>
                <Rocket size={14} />
                启动所选工作流
              </Button>
              <div className="text-center text-[11px] text-[var(--text-sub)]">
                已选 <span className="tnum text-[var(--text-main)]">{selectedNames.length}</span> /{' '}
                <span className="tnum text-[var(--text-main)]">{workflows.length}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="启动分析">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-[11px] text-[var(--text-sub)]">预计加载插件</div>
                  <div className="text-lg font-black tnum text-[var(--text-main)]">0</div>
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-[var(--text-sub)]">未识别节点</div>
                  <div className="text-lg font-black tnum text-[var(--text-main)]">0</div>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                选择工作流后展示分析结果。
              </div>

              <button
                onClick={() =>
                  showToast(
                    'info',
                    '未识别节点明细',
                    selectedNames.length === 0
                      ? '请先选择工作流，分析完成后可查看未识别节点。'
                      : '当前所选工作流未发现未识别节点。'
                  )
                }
                className="press w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-sub)] hover:text-indigo-500"
              >
                未识别节点明细
                <ChevronRight size={12} />
              </button>
              <button
                onClick={() =>
                  showToast('info', '临时禁用插件列表', '当前没有临时禁用的插件。')
                }
                className="press w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-sub)] hover:text-indigo-500"
              >
                临时禁用插件列表
                <ChevronRight size={12} />
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
