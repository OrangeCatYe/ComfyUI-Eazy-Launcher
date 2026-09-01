import { useState } from 'react'
import {
  PackageSearch,
  FileText,
  Search,
  Download,
  Upload,
  Terminal,
  Save,
  RotateCcw,
  Gauge,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { SectionCard, FieldRow } from '../components/ui/Blocks'

/*
 * 环境依赖 —— 依据「环境依赖.png」
 *
 * 结构（5 个区块，全部为页面内操作，输出走右侧终端）：
 *   1. PYPI 镜像源与测速
 *   2. 检测依赖文件
 *   3. ComfyUI 环境操作
 *   4. 第三方库管理
 *   5. 终端命令行
 *   6. 环境快照备份
 *
 * 注意：环境比较工具 / 查询引用插件 为终端交互（S4 实现）
 *       恢复快照依赖 在页面内渲染差异分组（S4 实现）
 *
 * 数据策略：空状态优先
 */

const MIRRORS = ['阿里云', '清华大学', '腾讯云', '华为云', '官方源']

export default function DepsPage({ onAction }) {
  const [mirror, setMirror] = useState(MIRRORS[0])
  const [speed, setSpeed] = useState(null)
  const [reqFile, setReqFile] = useState(null)
  const [libName, setLibName] = useState('')
  const [libVersion, setLibVersion] = useState('latest')

  const fire = (name, payload) => onAction && onAction(name, payload)

  return (
    <div className="p-6 space-y-5">
      {/* 1. PYPI 镜像源与测速 */}
      <SectionCard title="PYPI 镜像源与测速">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={mirror}
            onChange={(e) => setMirror(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] outline-none focus:border-indigo-400"
          >
            {MIRRORS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {speed !== null && (
            <span className="text-[11px] font-black text-emerald-600 tnum">({speed} 秒)</span>
          )}
          <Button variant="glass" size="sm">
            应用源
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('speedTest')}>
            <Gauge size={13} />
            测速
          </Button>
        </div>
      </SectionCard>

      {/* 2. 检测依赖文件 */}
      <SectionCard title="检测依赖文件">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-lighter)] border border-dashed border-[var(--border-main)]">
            <FileText size={14} className="text-[var(--text-sub)] shrink-0" />
            <span className="text-xs text-[var(--text-sub)] truncate flex-1">
              {reqFile || '未选择 requirements.txt 文件'}
            </span>
            <Button variant="glass" size="sm">
              选择文件
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="glass" size="sm" onClick={() => fire('analyzeReq')}>
              <Search size={13} />
              分析依赖文件
            </Button>
            <Button variant="glass" size="sm" onClick={() => fire('checkConflict')}>
              检测冲突缺失
            </Button>
            <Button variant="primary" size="sm" onClick={() => fire('installDeps')}>
              <Download size={13} />
              依赖实际安装
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* 3. ComfyUI 环境操作 */}
      <SectionCard title="ComfyUI 环境操作">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="glass" size="sm" onClick={() => fire('viewEnv')}>
            查看当前环境
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('findConflict')}>
            查找环境冲突
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('compareEnv')}>
            环境比较工具
          </Button>
        </div>
      </SectionCard>

      {/* 4. 第三方库管理 */}
      <SectionCard title="第三方库管理">
        <div className="space-y-3">
          <FieldRow label="库名：">
            <TextInput
              value={libName}
              onChange={(e) => setLibName(e.target.value)}
              placeholder="输入库名(如: numpy)..."
            />
            <Button variant="glass" size="sm" onClick={() => fire('findRefs', libName)}>
              <Search size={13} />
              搜索
            </Button>
            <Button variant="glass" size="sm" onClick={() => fire('findRefs', libName)}>
              查询引用插件
            </Button>
          </FieldRow>

          <FieldRow label="版本：">
            <TextInput
              value={libVersion}
              onChange={(e) => setLibVersion(e.target.value)}
              className="max-w-[200px]"
            />
            <Button variant="primary" size="sm">
              安装选中
            </Button>
            <Button variant="danger" size="sm">
              卸载选中
            </Button>
            <Button variant="glass" size="sm">
              安装轮子.whl
            </Button>
          </FieldRow>
        </div>
      </SectionCard>

      {/* 5. 终端命令行 */}
      <SectionCard title="终端命令行">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="glass" size="sm" onClick={() => fire('startTerminal')}>
            <Terminal size={13} />
            启动终端
          </Button>
          <Button variant="glass" size="sm">
            示例命令
          </Button>
        </div>
      </SectionCard>

      {/* 6. 环境快照备份 */}
      <SectionCard title="环境快照备份">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => fire('backupEnv')}>
            <Save size={13} />
            备份当前环境
          </Button>
          <Button variant="glass" size="sm" onClick={() => fire('restoreSnapshot')}>
            <RotateCcw size={13} />
            恢复快照依赖
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
