import { useState } from 'react'
import { Workflow, RefreshCw, Rocket, MapPin, ChevronRight, FileJson } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Input'
import { SectionCard, EmptyState } from '../../components/ui/Blocks'

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

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="glass" size="sm">
          <RefreshCw size={13} />
          刷新列表
        </Button>
        <Button variant="glass" size="sm">
          全选
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
              当前显示 <span className="tnum text-[var(--text-main)]">0</span> 条工作流
            </span>
          </div>

          <div className="px-5 py-4">
            <EmptyState
              icon={FileJson}
              title="暂无工作流"
              desc="把工作流文件放入 ComfyUI 的 workflows 目录后，点击「刷新列表」读取。"
            />
          </div>
        </section>

        {/* 启动与分析 */}
        <div className="space-y-4">
          <SectionCard>
            <div className="space-y-3">
              <Button variant="primary" size="md" className="w-full">
                <Rocket size={14} />
                启动所选工作流
              </Button>
              <div className="text-center text-[11px] text-[var(--text-sub)]">
                已选 <span className="tnum text-[var(--text-main)]">0</span> /{' '}
                <span className="tnum text-[var(--text-main)]">0</span>
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

              <button className="press w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-sub)] hover:text-indigo-500">
                未识别节点明细
                <ChevronRight size={12} />
              </button>
              <button className="press w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-[11px] font-black text-[var(--text-sub)] hover:text-indigo-500">
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
