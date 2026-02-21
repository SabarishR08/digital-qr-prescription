import QRCode from "qrcode";

export async function generateQrCodeDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360
  });
}
