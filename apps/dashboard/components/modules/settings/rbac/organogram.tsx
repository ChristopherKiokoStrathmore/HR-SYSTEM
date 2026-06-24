'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Download, Printer, Loader2, UserCircle2,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  useOrganigram, useSaveNode, useDeleteNode, useRoles, type OrganigramNode,
} from '@/lib/hooks/use-rbac-admin'

interface TreeNode extends OrganigramNode {
  children: TreeNode[]
}

function buildTree(nodes: OrganigramNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }))
  const roots: TreeNode[] = []
  map.forEach((node) => {
    if (node.parent_node && map.has(node.parent_node)) {
      map.get(node.parent_node)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function NodeRow({
  node, depth, onAddChild, onDelete,
}: {
  node: TreeNode
  depth: number
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  return (
    <div className="ml-0">
      <div
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: depth * 20 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn('text-text-muted', !hasChildren && 'invisible')}
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <UserCircle2 className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {node.title || node.role_name || 'Untitled position'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {node.role_name ? `Role: ${node.role_name}` : 'No role'}
              {node.user_id ? ` · User: ${node.user_id}` : ' · Unassigned'}
            </p>
          </div>
          <div className="flex-1" />
          <button onClick={() => onAddChild(node.id)} title="Add report" className="text-text-muted hover:text-accent">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(node.id)} title="Remove" className="text-text-muted hover:text-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && node.children.map((c) => (
        <NodeRow key={c.id} node={c} depth={depth + 1} onAddChild={onAddChild} onDelete={onDelete} />
      ))}
    </div>
  )
}

export function Organogram({ orgId }: { orgId: string }) {
  const { data: nodes = [], isLoading } = useOrganigram(orgId)
  const { data: roles = [] } = useRoles(orgId)
  const saveNode = useSaveNode(orgId)
  const deleteNode = useDeleteNode(orgId)

  const [adding, setAdding] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [roleId, setRoleId] = useState('')
  const [userId, setUserId] = useState('')

  const tree = useMemo(() => buildTree(nodes), [nodes])

  function openAdd(parent: string | null) {
    setParentId(parent)
    setTitle(''); setRoleId(''); setUserId('')
    setAdding(true)
  }

  async function handleAdd() {
    try {
      await saveNode.mutateAsync({
        parent_node: parentId,
        title: title.trim(),
        role: roleId || null,
        user_id: userId.trim() || null,
      })
      toast.success('Position added')
      setAdding(false)
    } catch (e) {
      toast.error('Failed to add position', String(e))
    }
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this position and all positions reporting to it?')) return
    deleteNode.mutate(id, {
      onSuccess: () => toast.success('Position removed'),
      onError: (e) => toast.error('Failed to remove', String(e)),
    })
  }

  // ---- Export (PNG / PDF) via canvas layout -------------------------------
  function layout() {
    // Tidy top-down layout: x by leaf order, y by depth.
    const positions: { node: TreeNode; x: number; y: number }[] = []
    let leaf = 0
    const W = 200, H = 64, GAPX = 30, GAPY = 50
    function place(n: TreeNode, depth: number): number {
      const y = depth * (H + GAPY) + 20
      let x: number
      if (n.children.length === 0) {
        x = leaf * (W + GAPX) + 20
        leaf++
      } else {
        const xs = n.children.map((c) => place(c, depth + 1))
        x = (xs[0] + xs[xs.length - 1]) / 2
      }
      positions.push({ node: n, x, y })
      return x
    }
    tree.forEach((r) => place(r, 0))
    return { positions, W, H }
  }

  function renderCanvas(): HTMLCanvasElement | null {
    const { positions, W, H } = layout()
    if (positions.length === 0) return null
    const maxX = Math.max(...positions.map((p) => p.x)) + W + 40
    const maxY = Math.max(...positions.map((p) => p.y)) + H + 40
    const canvas = document.createElement('canvas')
    canvas.width = maxX; canvas.height = maxY
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, maxX, maxY)
    const byId = new Map(positions.map((p) => [p.node.id, p]))
    // connectors
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5
    positions.forEach((p) => {
      if (p.node.parent_node && byId.has(p.node.parent_node)) {
        const parent = byId.get(p.node.parent_node)!
        ctx.beginPath()
        ctx.moveTo(parent.x + W / 2, parent.y + H)
        ctx.lineTo(p.x + W / 2, p.y)
        ctx.stroke()
      }
    })
    // boxes
    positions.forEach((p) => {
      ctx.fillStyle = '#fff7ed'; ctx.strokeStyle = '#C9A84C'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(p.x, p.y, W, H, 10); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#1f2937'; ctx.font = 'bold 13px sans-serif'
      ctx.fillText((p.node.title || p.node.role_name || 'Position').slice(0, 24), p.x + 12, p.y + 26)
      ctx.fillStyle = '#6b7280'; ctx.font = '11px sans-serif'
      ctx.fillText((p.node.role_name || 'No role').slice(0, 26), p.x + 12, p.y + 44)
    })
    return canvas
  }

  function exportPNG() {
    const canvas = renderCanvas()
    if (!canvas) return toast.error('Nothing to export')
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'organogram.png'
    a.click()
  }

  async function exportPDF() {
    const canvas = renderCanvas()
    if (!canvas) return toast.error('Nothing to export')
    const { default: jsPDF } = await import('jspdf')
    const landscape = canvas.width >= canvas.height
    const pdf = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'px',
      format: [canvas.width + 40, canvas.height + 40] })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 20, 20, canvas.width, canvas.height)
    pdf.save('organogram.pdf')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Organogram</h3>
          <p className="text-xs text-text-muted">Interactive org chart for this company.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-ghost text-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={exportPNG} className="btn-ghost text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> PNG
          </button>
          <button onClick={exportPDF} className="btn-ghost text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => openAdd(null)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add position
          </button>
        </div>
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-surface-alt p-3 space-y-3">
          <p className="text-sm font-medium text-text-primary">
            New position {parentId ? '(reporting to selected)' : '(top level)'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="input" placeholder="Title (e.g. Head of Sales)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">No role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input className="input" placeholder="Assign user ID / email (optional)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={saveNode.isPending} className="btn-primary text-sm flex items-center gap-1.5">
              {saveNode.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : tree.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl text-text-muted">
          <p className="text-sm">No organogram yet.</p>
          <p className="text-xs mt-0.5">Add a top-level position to start building the chart.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border p-3 print:border-0">
          {tree.map((n) => (
            <NodeRow key={n.id} node={n} depth={0} onAddChild={openAdd} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
