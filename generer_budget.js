const ExcelJS = require('exceljs');
const path = require('path');

async function createBudgetFile() {
    const workbook = new ExcelJS.Workbook();
    
    // --- FEUILLE 1 : SUIVI ---
    const sheet = workbook.addWorksheet('Suivi Dépenses');

    // Colonnes
    sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Catégorie', key: 'cat', width: 20 },
        { header: 'Description', key: 'desc', width: 30 },
        { header: 'Recettes (+)', key: 'in', width: 15, style: { numFmt: '#,##0.00 €' } },
        { header: 'Dépenses (-)', key: 'out', width: 15, style: { numFmt: '#,##0.00 €' } },
        { header: 'Solde', key: 'balance', width: 15, style: { numFmt: '#,##0.00 €', font: { bold: true } } }
    ];

    // Style des entêtes
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
    };
    sheet.getRow(1).alignment = { horizontal: 'center' };

    // Données d'exemple
    const startRow = 2;
    const initialData = [
        { date: new Date(), cat: 'Salaire', desc: 'Virement mensuel', in: 2500, out: null },
        { date: new Date(), cat: 'Loyer', desc: 'Loyer appartement', in: null, out: 800 },
        { date: new Date(), cat: 'Alimentation', desc: 'Courses Supermarché', in: null, out: 150 },
        { date: new Date(), cat: 'Loisirs', desc: 'Restaurant', in: null, out: 60 },
        { date: new Date(), cat: 'Musique', desc: 'Achat Vinyles', in: null, out: 45 }
    ];

    // Ajouter les lignes
    initialData.forEach((row, index) => {
        const r = sheet.addRow(row);
        // Formule pour le solde : Ligne précédente + Recette - Dépense
        const currentRow = startRow + index;
        if (index === 0) {
            r.getCell('balance').value = { formula: `D${currentRow}-E${currentRow}` };
        } else {
            r.getCell('balance').value = { formula: `F${currentRow - 1}+D${currentRow}-E${currentRow}` };
        }
    });

    // --- FEUILLE 2 : SYNTHESE (Simple) ---
    const sheetSummary = workbook.addWorksheet('Synthèse');
    sheetSummary.columns = [
        { header: 'Indicateur', key: 'k', width: 25 },
        { header: 'Montant', key: 'v', width: 20, style: { numFmt: '#,##0.00 €' } }
    ];
    
    sheetSummary.getRow(1).font = { bold: true };
    
    sheetSummary.addRow({ k: 'Total Recettes', v: { formula: "SUM('Suivi Dépenses'!D:D)" } });
    sheetSummary.addRow({ k: 'Total Dépenses', v: { formula: "SUM('Suivi Dépenses'!E:E)" } });
    sheetSummary.addRow({ k: 'Reste à vivre', v: { formula: "B2-B3" } });

    // Sauvegarde
    const filename = path.join(process.cwd(), 'Mon_Budget_Perso.xlsx');
    await workbook.xlsx.writeFile(filename);
    console.log(`Fichier créé : ${filename}`);
}

createBudgetFile().catch(console.error);
