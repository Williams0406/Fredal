"use client";

import { useEffect, useState } from "react";
import { compraAPI, itemAPI, proveedorAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const IGV = 1.18;

const emptyDetalle = {
  item: "",
  cantidad: 1,
  moneda: "PEN",
  tipo_registro: "VALOR_UNITARIO",
  monto: "",
};

export default function CompraForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =========================
     CABECERA
  ========================= */

  const [cabecera, setCabecera] = useState({
    fecha: "",
    proveedor: "",
    tipo_comprobante: "",
    codigo_comprobante: "",
  });

  /* =========================
     DETALLE
  ========================= */

  const [detalles, setDetalles] = useState([{ ...emptyDetalle }]);

  useEffect(() => {
    itemAPI.list().then((res) => setItems(res.data));
    proveedorAPI.list().then((res) => setProveedores(res.data));
  }, []);

  /* =========================
     HELPERS
  ========================= */

  const updateDetalle = (index, field, value) => {
    const copy = [...detalles];
    copy[index][field] = value;
    setDetalles(copy);
  };

  const addDetalle = () =>
    setDetalles((prev) => [...prev, { ...emptyDetalle }]);

  const removeDetalle = (index) =>
    setDetalles((prev) => prev.filter((_, i) => i !== index));

  const calcular = (d) => {
    const monto = Number(d.monto || 0);
    const cantidad = Number(d.cantidad || 1);

    let valor_unitario = 0;
    let costo_unitario = 0;
    let valor_total = 0;
    let costo_total = 0;

    switch (d.tipo_registro) {
      case "VALOR_UNITARIO":
        valor_unitario = monto;
        costo_unitario = monto * IGV;
        valor_total = valor_unitario * cantidad;
        costo_total = costo_unitario * cantidad;
        break;

      case "COSTO_UNITARIO":
        costo_unitario = monto;
        valor_unitario = monto / IGV;
        valor_total = valor_unitario * cantidad;
        costo_total = costo_unitario * cantidad;
        break;

      case "VALOR_TOTAL":
        valor_total = monto;
        valor_unitario = monto / cantidad;
        costo_unitario = valor_unitario * IGV;
        costo_total = costo_unitario * cantidad;
        break;

      case "COSTO_TOTAL":
        costo_total = monto;
        costo_unitario = monto / cantidad;
        valor_unitario = costo_unitario / IGV;
        valor_total = valor_unitario * cantidad;
        break;
    }

    return {
      valor_unitario,
      costo_unitario,
      valor_total,
      costo_total,
    };
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async () => {
    setLoading(true);

    try {
      for (const d of detalles) {
        await compraAPI.create({
          fecha: cabecera.fecha,
          proveedor: cabecera.proveedor || null,
          tipo_comprobante: cabecera.tipo_comprobante,
          codigo_comprobante: cabecera.codigo_comprobante,

          item: Number(d.item),
          cantidad: Number(d.cantidad),
          moneda: d.moneda,
          tipo_registro: d.tipo_registro,
          monto: Number(d.monto),
        });
      }

      setOpen(false);
      setCabecera({
        fecha: "",
        proveedor: "",
        tipo_comprobante: "",
        codigo_comprobante: "",
      });
      setDetalles([{ ...emptyDetalle }]);
      onCreated?.();
    } catch (err) {
      console.error(err);
      alert("Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Registrar compra</Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Registrar compra</h2>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </div>

            {/* CABECERA */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                value={cabecera.fecha}
                onChange={(e) =>
                  setCabecera({ ...cabecera, fecha: e.target.value })
                }
                required
              />

              <Select
                value={cabecera.proveedor}
                onValueChange={(v) =>
                  setCabecera({ ...cabecera, proveedor: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Proveedor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={cabecera.tipo_comprobante}
                onValueChange={(v) =>
                  setCabecera({ ...cabecera, tipo_comprobante: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo comprobante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACTURA">Factura</SelectItem>
                  <SelectItem value="BOLETA">Boleta</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Código comprobante"
                value={cabecera.codigo_comprobante}
                onChange={(e) =>
                  setCabecera({
                    ...cabecera,
                    codigo_comprobante: e.target.value,
                  })
                }
                required
              />
            </div>

            {/* DETALLE */}
            <div className="space-y-4">
              {detalles.map((d, i) => {
                const calc = calcular(d);

                return (
                  <div
                    key={i}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="grid grid-cols-5 gap-2">
                      <Select
                        value={d.item}
                        onValueChange={(v) =>
                          updateDetalle(i, "item", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((it) => (
                            <SelectItem key={it.id} value={it.id.toString()}>
                              {it.codigo} — {it.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="1"
                        value={d.cantidad}
                        onChange={(e) =>
                          updateDetalle(i, "cantidad", e.target.value)
                        }
                      />

                      <Select
                        value={d.moneda}
                        onValueChange={(v) =>
                          updateDetalle(i, "moneda", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PEN">PEN</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={d.tipo_registro}
                        onValueChange={(v) =>
                          updateDetalle(i, "tipo_registro", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VALOR_UNITARIO">
                            Valor unitario
                          </SelectItem>
                          <SelectItem value="COSTO_UNITARIO">
                            Costo unitario
                          </SelectItem>
                          <SelectItem value="VALOR_TOTAL">
                            Valor total
                          </SelectItem>
                          <SelectItem value="COSTO_TOTAL">
                            Costo total
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Monto"
                        value={d.monto}
                        onChange={(e) =>
                          updateDetalle(i, "monto", e.target.value)
                        }
                      />
                    </div>

                    <div className="text-xs text-gray-600 grid grid-cols-4 gap-2">
                      <span>V.U.: {calc.valor_unitario.toFixed(2)}</span>
                      <span>C.U.: {calc.costo_unitario.toFixed(2)}</span>
                      <span>V.T.: {calc.valor_total.toFixed(2)}</span>
                      <span>C.T.: {calc.costo_total.toFixed(2)}</span>
                    </div>

                    {detalles.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeDetalle(i)}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={addDetalle}>
              + Agregar ítem
            </Button>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Guardando..." : "Guardar compra"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
