import React, { useCallback, useMemo, useState } from 'react'
import InvoicePage from './components/InvoicePage'
import { Invoice } from './data/types'
import { initialInvoice } from './data/initialData'

const ACTIVE_INVOICE_KEY = 'invoiceData'
const ARCHIVED_INVOICES_KEY = 'invoiceDataArchive'
const ACTIVE_INVOICE_ID_KEY = 'invoiceDataActiveId'

interface SavedInvoice {
  id: string
  name: string
  data: Invoice
  updatedAt: string
}

interface InvoiceStore {
  activeId: string
  invoices: SavedInvoice[]
}

const createInvoiceId = () => `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}`

const cloneInvoice = (invoice: Invoice) => JSON.parse(JSON.stringify(invoice)) as Invoice

const getInvoiceName = (invoice: Invoice) => {
  const from = invoice.companyName.trim()
  const to = invoice.clientName.trim()
  const number = invoice.invoiceTitle.trim()

  if (from && to && number) {
    return `${from} to ${to} (${number})`
  }

  if (from && to) {
    return `${from} to ${to}`
  }

  return from || to || number || 'Untitled invoice'
}

const parseInvoice = (value: string | null) => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as Invoice
  } catch (_e) {
    return null
  }
}

const parseInvoiceArchive = (value: string | null) => {
  if (!value) {
    return null
  }

  try {
    const invoices = JSON.parse(value) as SavedInvoice[]
    return Array.isArray(invoices) ? invoices : null
  } catch (_e) {
    return null
  }
}

const readInvoiceStore = (): InvoiceStore => {
  const legacyInvoice = parseInvoice(window.localStorage.getItem(ACTIVE_INVOICE_KEY))
  const archivedInvoices = parseInvoiceArchive(window.localStorage.getItem(ARCHIVED_INVOICES_KEY))
  const activeId = window.localStorage.getItem(ACTIVE_INVOICE_ID_KEY)

  if (archivedInvoices && archivedInvoices.length > 0) {
    const invoiceExists = activeId
      ? archivedInvoices.some((invoice) => invoice.id === activeId)
      : false

    return {
      activeId: invoiceExists ? activeId as string : archivedInvoices[0].id,
      invoices: archivedInvoices,
    }
  }

  const data = legacyInvoice || initialInvoice
  const id = createInvoiceId()

  return {
    activeId: id,
    invoices: [
      {
        id,
        name: getInvoiceName(data),
        data: cloneInvoice(data),
        updatedAt: new Date().toISOString(),
      },
    ],
  }
}

const saveInvoiceStore = (store: InvoiceStore) => {
  const activeInvoice = store.invoices.find((invoice) => invoice.id === store.activeId)

  window.localStorage.setItem(ARCHIVED_INVOICES_KEY, JSON.stringify(store.invoices))
  window.localStorage.setItem(ACTIVE_INVOICE_ID_KEY, store.activeId)

  if (activeInvoice) {
    window.localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(activeInvoice.data))
  }
}

function App() {
  const [invoiceStore, setInvoiceStore] = useState<InvoiceStore>(readInvoiceStore)

  const activeInvoice = useMemo(
    () => invoiceStore.invoices.find((invoice) => invoice.id === invoiceStore.activeId),
    [invoiceStore]
  )

  const onInvoiceUpdated = useCallback((invoice: Invoice) => {
    setInvoiceStore((store) => {
      const updatedStore = {
        ...store,
        invoices: store.invoices.map((savedInvoice) => {
          if (savedInvoice.id !== store.activeId) {
            return savedInvoice
          }

          return {
            ...savedInvoice,
            name: getInvoiceName(invoice),
            data: cloneInvoice(invoice),
            updatedAt: new Date().toISOString(),
          }
        }),
      }

      saveInvoiceStore(updatedStore)
      return updatedStore
    })
  }, [])

  const handleInvoiceChange = (id: string) => {
    setInvoiceStore((store) => {
      const updatedStore = { ...store, activeId: id }

      saveInvoiceStore(updatedStore)
      return updatedStore
    })
  }

  const handleCreateInvoice = () => {
    setInvoiceStore((store) => {
      const sourceInvoice = store.invoices.find((invoice) => invoice.id === store.activeId)
      const data = cloneInvoice(sourceInvoice ? sourceInvoice.data : initialInvoice)
      const newInvoice = {
        id: createInvoiceId(),
        name: `${getInvoiceName(data)} copy`,
        data,
        updatedAt: new Date().toISOString(),
      }
      const updatedStore = {
        activeId: newInvoice.id,
        invoices: [...store.invoices, newInvoice],
      }

      saveInvoiceStore(updatedStore)
      return updatedStore
    })
  }

  return (
    <div className="app">
      <h1 className="center fs-30">React Invoice Generator</h1>
      <div className="invoice-switcher">
        <div className="invoice-switcher__label">Saved invoices</div>
        <div className="invoice-switcher__controls">
          <select
            id="invoice-switcher"
            className="invoice-switcher__select"
            aria-label="Saved invoices"
            value={invoiceStore.activeId}
            onChange={(event) => handleInvoiceChange(event.target.value)}
          >
            {invoiceStore.invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.name}
              </option>
            ))}
          </select>
          <div className="invoice-switcher__actions">
            <button type="button" className="invoice-switcher__button" onClick={handleCreateInvoice}>
              Duplicate
            </button>
          </div>
        </div>
      </div>
      <InvoicePage
        key={invoiceStore.activeId}
        data={activeInvoice ? activeInvoice.data : initialInvoice}
        onChange={onInvoiceUpdated}
      />
    </div>
  )
}

export default App
