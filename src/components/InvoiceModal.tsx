"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  FileText,
  Car,
  AlertCircle,
  Edit3,
} from "lucide-react";
import type { InvoiceData } from "@/lib/invoicePdf";
import { downloadInvoicePDF } from "@/lib/invoicePdf";
import { formatINR } from "@/lib/utils";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
}

export default function InvoiceModal({ isOpen, onClose, data: initialData }: InvoiceModalProps) {
  const [data, setData] = useState<InvoiceData>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const ok = await downloadInvoicePDF(data, `RK_Travel_Hub_Invoice_${data.receiptNo}.pdf`);
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Floating Control Bar (Hidden on Print) */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white">
              Official Cash Receipt &amp; Voucher #{data.receiptNo}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isEditing
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
              title="Edit voucher fields"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEditing ? "Editing Mode" : "Edit Fields"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              title="Print Voucher"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D62FE] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? "Generating..." : "Download PDF"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white">
          <div className="bg-white max-w-[800px] mx-auto shadow-sm border border-slate-200/90 rounded-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
            
            {/* 1. Header (Logo on Left, Dark Banner on Right) */}
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-7 pb-4 bg-white border-b border-slate-100">
              
              {/* Left Brand Identity */}
              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 shrink-0">
                  <Image
                    src="/images/rk-logo.png"
                    alt="RK Travel Hub"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0D233A] leading-tight">
                    RK TRAVEL HUB
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.25em] text-slate-600 uppercase">
                    TRAVELLER&apos;S HUB
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold tracking-wider mt-0.5">
                    COMFORT &bull; SAFETY &bull; RELIABILITY
                  </p>
                </div>
              </div>

              {/* Right Tour Categories Pill (Navy Accent) */}
              <div className="mt-4 sm:mt-0 bg-[#0D233A] text-white px-5 py-3 rounded-2xl sm:rounded-l-2xl sm:rounded-r-none text-right shadow-sm">
                <ul className="text-[11px] font-semibold space-y-1 text-slate-200">
                  <li className="flex items-center justify-end gap-2">
                    <span>Group Tours</span>
                    <Car className="w-3 h-3 text-sky-400" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>Pilgrimage Trips</span>
                    <MapPin className="w-3 h-3 text-sky-400" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>Family Trips</span>
                    <User className="w-3 h-3 text-sky-400" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>Corporate Trips</span>
                    <CreditCard className="w-3 h-3 text-sky-400" />
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. Main Title & Meta Box */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-5 sm:px-7 py-4 bg-white">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0D233A] tracking-tight">
                  {data.paymentStage === 'advance' ? 'ADVANCE PAYMENT RECEIPT' : data.paymentStage === 'balance' ? 'FINAL SETTLEMENT INVOICE' : 'INVOICE'}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide">
                  {data.paymentStage === 'advance' ? 'PRE-TRIP ADVANCE RECEIPT' : data.paymentStage === 'balance' ? 'POST-TRIP BALANCE SETTLEMENT VOUCHER' : 'CASH RECEIPT / PAYMENT VOUCHER'}
                </p>
              </div>

              {/* Right Meta Card */}
              <div className="border border-slate-300 rounded-xl p-3 sm:p-3.5 bg-slate-50/70 text-xs min-w-[240px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Receipt No. :</span>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-[#0D233A] font-extrabold rounded-md text-xs">
                    {data.receiptNo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Book No. :</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.bookNo}
                      onChange={(e) => setData({ ...data, bookNo: e.target.value })}
                      className="border border-blue-400 rounded px-1.5 py-0.5 text-xs w-28 bg-white font-medium"
                    />
                  ) : (
                    <span className="font-semibold text-slate-800">{data.bookNo || "BK-001"}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Date :</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.date}
                      onChange={(e) => setData({ ...data, date: e.target.value })}
                      className="border border-blue-400 rounded px-1.5 py-0.5 text-xs w-28 bg-white font-medium"
                    />
                  ) : (
                    <span className="font-semibold text-slate-800">{data.date}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Customer & Payment Details (2-Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 sm:px-7 py-3">
              
              {/* Customer Details Card */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                <div className="bg-[#DDE7F2] text-[#0D233A] px-3.5 py-2 flex items-center gap-2 font-bold text-xs">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>CUSTOMER DETAILS</span>
                </div>
                <div className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Customer Name :</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={data.customerName}
                        onChange={(e) => setData({ ...data, customerName: e.target.value })}
                        className="border border-blue-400 rounded px-1 py-0.5 text-xs w-40 font-bold"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">{data.customerName}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Mobile Number :</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={data.customerMobile}
                        onChange={(e) => setData({ ...data, customerMobile: e.target.value })}
                        className="border border-blue-400 rounded px-1 py-0.5 text-xs w-40 font-bold"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">{data.customerMobile}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Trip / Route :</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={data.route}
                        onChange={(e) => setData({ ...data, route: e.target.value })}
                        className="border border-blue-400 rounded px-1 py-0.5 text-xs w-40 font-bold"
                      />
                    ) : (
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">{data.route}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Journey Date :</span>
                    <span className="font-bold text-slate-900">{data.journeyDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">No. of Pax :</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={data.pax}
                        onChange={(e) => setData({ ...data, pax: e.target.value })}
                        className="border border-blue-400 rounded px-1 py-0.5 text-xs w-20 font-bold"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">{data.pax || "-"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details Card */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white flex flex-col justify-between">
                <div>
                  <div className="bg-[#DDE7F2] text-[#0D233A] px-3.5 py-2 flex items-center gap-2 font-bold text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                    <span>PAYMENT DETAILS</span>
                  </div>
                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500 font-medium">Trip Amount :</span>
                      <span className="font-bold text-slate-900">{formatINR(data.tripAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500 font-medium">Advance Received :</span>
                      <span className="font-bold text-emerald-600">{formatINR(data.advanceReceived)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Balance Amount :</span>
                      <span className="font-bold text-rose-600">{formatINR(data.balanceAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-box: Amount Received (in Words) */}
                <div className="m-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Amount Received (in Words)
                  </p>
                  <p className="text-xs font-bold text-[#0D233A] italic">
                    &ldquo;{data.amountReceivedInWords}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Trip Details (Full Width Card) */}
            <div className="px-5 sm:px-7 py-2">
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                <div className="bg-[#DDE7F2] text-[#0D233A] px-3.5 py-2 flex items-center gap-2 font-bold text-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-700" />
                  <span>TRIP DETAILS</span>
                </div>
                <div className="p-3.5 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Route / Places :</span>
                      <span className="font-bold text-slate-900">{data.routePlaces}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Total Distance :</span>
                      <span className="font-bold text-slate-900">{data.totalDistance} km</span>
                      <span className="text-slate-400 text-[11px]">
                        (From: {data.fromKm} &bull; To: {data.toKm})
                      </span>
                    </div>
                  </div>

                  {/* Trip Type Checkboxes */}
                  <div className="flex items-center gap-4 flex-wrap pt-1 text-[11px]">
                    <span className="text-slate-500 font-medium">Trip Type :</span>
                    {(["Group Tour", "Pilgrimage Trip", "Family Trip", "Corporate Trip", "Other"] as const).map(
                      (type) => (
                        <label key={type} className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="tripType"
                            checked={data.tripType === type}
                            onChange={() => setData({ ...data, tripType: type })}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span
                            className={
                              data.tripType === type ? "font-bold text-slate-900" : "text-slate-600"
                            }
                          >
                            {type}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Vehicle & Driver Details (2-Column Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 sm:px-7 py-2">
              
              {/* Vehicle Details */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                <div className="bg-[#DDE7F2] text-[#0D233A] px-3.5 py-2 flex items-center gap-2 font-bold text-xs">
                  <Car className="w-3.5 h-3.5 text-blue-700" />
                  <span>VEHICLE DETAILS</span>
                </div>
                <div className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Vehicle No. :</span>
                    <span className="font-bold text-slate-900">{data.vehicleNo}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Vehicle Type :</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      {(["9+1", "12+1", "17+1", "Other"] as const).map((vt) => (
                        <span
                          key={vt}
                          className={`px-1.5 py-0.5 rounded ${
                            data.vehicleType === vt
                              ? "bg-blue-100 text-blue-800 font-bold"
                              : "text-slate-500"
                          }`}
                        >
                          {vt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Total Distance :</span>
                    <span className="font-bold text-slate-900">{data.vehicleDistance} km</span>
                  </div>
                </div>
              </div>

              {/* Driver Details */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                <div className="bg-[#DDE7F2] text-[#0D233A] px-3.5 py-2 flex items-center gap-2 font-bold text-xs">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  <span>DRIVER DETAILS</span>
                </div>
                <div className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Driver Name :</span>
                    <span className="font-bold text-slate-900">{data.driverName}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Mobile Number :</span>
                    <span className="font-bold text-slate-900">{data.driverMobile}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Duty Start :</span>
                    <span className="font-bold text-slate-900">{data.dutyStart}</span>
                    <span className="text-slate-500 font-medium ml-2">Duty End :</span>
                    <span className="font-bold text-slate-900">{data.dutyEnd}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Remarks / Notes (Ruled Lines) */}
            <div className="px-5 sm:px-7 py-2">
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                <div className="bg-[#DDE7F2] text-[#0D233A] px-3.5 py-2 flex items-center gap-2 font-bold text-xs">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>REMARKS / TRIP DETAILS</span>
                </div>
                <div className="p-3.5 space-y-1.5 text-xs">
                  <p className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                    {data.remarks || "Payment recorded with thanks."}
                  </p>
                  <div className="h-4 border-b border-slate-200/70" />
                  <div className="h-4 border-b border-slate-200/70" />
                </div>
              </div>
            </div>

            {/* 7. Signatures & Terms & Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 sm:px-7 py-4 items-end">
              
              {/* Signatures */}
              <div className="flex items-center justify-around text-center pt-8">
                <div>
                  <div className="w-36 border-t border-slate-900 mb-1" />
                  <p className="text-xs font-bold text-slate-800">Received By</p>
                </div>
                <div>
                  <div className="w-36 border-t border-slate-900 mb-1" />
                  <p className="text-xs font-bold text-slate-800">Authorised Signatory</p>
                </div>
              </div>

              {/* Terms & Conditions Box */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-[10px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#0D233A]">
                  <AlertCircle className="w-3 h-3 text-blue-600" />
                  <span>Terms &amp; Conditions</span>
                </div>
                <ul className="text-slate-600 space-y-0.5 list-disc pl-3.5">
                  <li>Passenger must carry a valid ID proof if required.</li>
                  <li>RK Travel Hub is not responsible for loss of personal belongings.</li>
                  <li>Trip timings may vary due to traffic or weather conditions.</li>
                  <li>Any damages caused to the vehicle will be charged to the customer.</li>
                  <li>Payment once made is non-refundable.</li>
                </ul>
              </div>
            </div>

            {/* 8. Bottom Navy Footer Banner */}
            <div className="bg-[#0D233A] text-white px-5 sm:px-7 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="text-[11px] font-semibold text-slate-200 leading-tight">
                  <p>98 09 20 70 80 &bull; 89 43 20 70 80</p>
                  <p>98 95 20 70 85 &bull; 85 89 87 26 89</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-white">
                    RK TRAVEL HUB
                  </p>
                  <p className="text-[10px] text-slate-300">Traveller&apos;s Hub</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
