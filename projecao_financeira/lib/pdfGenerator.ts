import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, ProjectionSummary, Scenario } from '@/types';
import { translations, PdfLanguage } from '@/locales/pdfTranslations';

interface GeneratorProps {
  project: Project;
  scenario: Scenario;
  projection: ProjectionSummary;
  lang: PdfLanguage;
  chartElementId?: string;
}

export async function generatePDF({ project, scenario, projection, lang }: GeneratorProps) {
  const t = translations[lang];
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

  // --- Header ---
  const drawHeader = (pageNumber: number, titleSuffix: string = "") => {
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(project.name, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${t.title} | ${t.subtitle} ${titleSuffix}`, 14, 26);

    const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR');
    doc.setFontSize(8);
    doc.text(`${t.generated_on}: ${today}`, 280, 20, { align: 'right' });
    doc.text(`${t.scenario}: ${scenario.name}`, 280, 24, { align: 'right' });
    doc.text(`${t.currency}: ${project.currency_main}`, 280, 28, { align: 'right' });
  };

  drawHeader(1);
  let currentY = 35;

  // --- Tabela DRE ---
  const fmt = (val: number) => {
    if (Math.abs(val) < 0.01) return "-";
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR', { 
        style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 
    }).format(val);
  };

  const totalMonths = projection.totals.revenue.length;
  const years = Math.ceil(totalMonths / 12); 

  for (let yearIndex = 0; yearIndex < years; yearIndex++) {
    const startMonth = yearIndex * 12;
    const endMonth = Math.min(startMonth + 12, totalMonths);
    const sliceLength = endMonth - startMonth;

    if (yearIndex > 0) {
        doc.addPage();
        drawHeader(yearIndex + 1, `- Year ${yearIndex + 1}`);
        currentY = 35;
    }

    const monthLabels = Array.from({ length: sliceLength }, (_, i) => `M${startMonth + i + 1}`);
    const showSetup = yearIndex === 0;
    
    const headRow = [
      t.headers.account,
      showSetup ? t.headers.setup : "Prev.",
      ...monthLabels,
      t.headers.total
    ];

    const createRow = (label: string, fullDataArray: any[], preOpValue: number, isTotalRow = false) => {
      // Proteção contra undefined
      if (!fullDataArray) return [label, "-", ...Array(sliceLength).fill("-"), "-"];

      const yearData = fullDataArray.slice(startMonth, endMonth);
      const yearSum = yearData.reduce((a: number, b: any) => a + (b.value || 0), 0);
      let firstColVal = "-";
      if (showSetup) {
        firstColVal = fmt(preOpValue);
      }
      return [label, firstColVal, ...yearData.map((m: any) => fmt(m.value)), fmt(yearSum)];
    };

    // CORREÇÃO: preOperational agora está na raiz de 'projection', não dentro de 'totals'
    const T = projection.totals;
    const P = projection.preOperational; 

    const bodyData = [
        createRow(t.rows.revenue, T.revenue, P.revenue),
        createRow(t.rows.taxes_sale, T.taxes_sale, P.taxes_sale),
        createRow(t.rows.net_revenue, T.net_revenue, (P.revenue - P.taxes_sale), true), // Usando net_revenue calculado
        createRow(t.rows.costs_variable, T.costs_variable, P.costs_variable),
        createRow(t.rows.contribution_margin, T.contribution_margin, 0, true),
        createRow(t.rows.costs_fixed, T.costs_fixed, P.costs_fixed),
        createRow(t.rows.ebitda, T.ebitda, P.ebitda, true),
        createRow(t.rows.depreciation, T.depreciation, P.depreciation),
        createRow(t.rows.ebit, T.ebit, P.ebit),
        createRow(t.rows.financial_revenue, T.financial_revenue, P.financial_revenue),
        createRow(t.rows.financial_expense, T.financial_expense, P.financial_expense),
        createRow(t.rows.taxes_profit, T.tax_profit, P.tax_profit),
        createRow(t.rows.net_result, T.net_result, P.net_result, true),
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        createRow(t.rows.cash_flow, T.cash_flow, P.cash_flow),
        createRow(t.rows.accumulated_cash, T.cash_accumulated, P.cash_accumulated, true),
    ];

    autoTable(doc, {
        startY: currentY,
        head: [headRow],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        styles: { cellPadding: 1, overflow: 'ellipsize' },
        didParseCell: function (data) {
            const rawRow = data.row.raw as any;
            if (rawRow && (
                rawRow[0] === t.rows.ebitda || 
                rawRow[0] === t.rows.net_result || 
                rawRow[0] === t.rows.accumulated_cash
            )) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 240, 240];
            }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY;
  }

  // --- Assinaturas ---
  const signatureBlockHeight = 50; 
  if (currentY + signatureBlockHeight > 190) {
    doc.addPage();
    currentY = 40; 
  } else {
    currentY += 40;
  }

  doc.setLineWidth(0.5);
  doc.line(30, currentY, 110, currentY); 
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(t.signatures.ceo, 70, currentY + 5, { align: 'center' });

  doc.line(170, currentY, 250, currentY);
  doc.text(t.signatures.accountant, 210, currentY + 5, { align: 'center' });

  // --- Rodapé ---
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
     doc.setPage(i);
     doc.setFontSize(8);
     doc.setTextColor(150);
     doc.text(t.footer_confidential, 14, 200);
     doc.text(`${t.currency}: ${project.currency_main} | Page ${i} of ${pageCount}`, 280, 200, { align: 'right' });
  }

  doc.save(`Projection_${project.name}_${lang}.pdf`);
}