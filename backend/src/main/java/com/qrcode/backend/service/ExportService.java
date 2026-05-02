package com.qrcode.backend.service;

import com.qrcode.backend.dto.export.AttendanceCourseInfo;
import com.qrcode.backend.dto.export.AttendanceReportDTO;
import com.qrcode.backend.dto.export.StudentAttendanceRow;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

/**
 * Dịch vụ xuất báo cáo điểm danh ra file Excel (.xlsx) sử dụng Apache POI XSSF.
 *
 * <p>Cấu trúc file xuất ra:</p>
 * <ul>
 *   <li>Dòng 1: Tên học phần (in đậm)</li>
 *   <li>Dòng 2: Mã lớp học phần (in đậm)</li>
 *   <li>Dòng 3: Tên giảng viên (in đậm)</li>
 *   <li>Dòng 4: Học kỳ (in đậm)</li>
 *   <li>Dòng 5: (trống — phân cách)</li>
 *   <li>Dòng 6+: Bảng dữ liệu điểm danh (STT, Mã SV, Họ Tên, Trạng thái, Thời gian)</li>
 * </ul>
 */
@Service
public class ExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    /**
     * Tạo file Excel báo cáo điểm danh từ {@link AttendanceReportDTO}.
     *
     * @param report DTO chứa thông tin học phần và danh sách điểm danh sinh viên
     * @return {@link ByteArrayInputStream} của file .xlsx đã tạo
     * @throws IOException nếu quá trình ghi file gặp lỗi
     */
    public ByteArrayInputStream generateAttendanceExcel(AttendanceReportDTO report) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Điểm Danh");

            // ── Styles ───────────────────────────────────────────────────────────
            CellStyle headerInfoStyle = createHeaderInfoStyle(workbook);
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            CellStyle normalStyle     = createNormalStyle(workbook);
            CellStyle absentStyle     = createAbsentStyle(workbook);   // Đỏ cho Vắng mặt

            // ── Dòng 1-4: Thông tin học phần ─────────────────────────────────────
            AttendanceCourseInfo info = report.getCourseInfo();
            writeInfoRow(sheet, 0, "Học phần:  " + info.getSubjectName(), headerInfoStyle);
            writeInfoRow(sheet, 1, "Mã lớp HP: " + info.getCourseCode(),  headerInfoStyle);
            writeInfoRow(sheet, 2, "Giảng viên: " + info.getTeacherName(), headerInfoStyle);
            writeInfoRow(sheet, 3, "Học kỳ:    " + info.getSemesterName(), headerInfoStyle);
            // Dòng 5 trống
            sheet.createRow(4);

            // ── Dòng 6: Header bảng ───────────────────────────────────────────────
            Row tableHeader = sheet.createRow(5);
            String[] headers = {"STT", "Mã Sinh Viên", "Họ và Tên", "Trạng Thái", "Thời Gian Điểm Danh"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = tableHeader.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(tableHeaderStyle);
            }

            // ── Dòng 7+: Dữ liệu sinh viên ───────────────────────────────────────
            int rowIdx = 6;
            for (StudentAttendanceRow student : report.getStudents()) {
                Row row = sheet.createRow(rowIdx++);

                createCell(row, 0, String.valueOf(student.getStt()), normalStyle);
                createCell(row, 1, nullSafe(student.getStudentCode()), normalStyle);
                createCell(row, 2, nullSafe(student.getFullName()),    normalStyle);

                // Trạng thái: màu đỏ nếu Vắng mặt
                String status = student.isPresent() ? "Có mặt" : "Vắng mặt";
                CellStyle statusStyle = student.isPresent() ? normalStyle : absentStyle;
                createCell(row, 3, status, statusStyle);

                // Thời gian quét mã
                String timeStr = student.getCheckInTime() != null
                        ? student.getCheckInTime().format(DATE_FMT)
                        : "—";
                createCell(row, 4, timeStr, normalStyle);
            }

            // ── Auto-size các cột ─────────────────────────────────────────────────
            sheet.setColumnWidth(0, 8 * 256);   // STT
            sheet.setColumnWidth(1, 20 * 256);  // Mã SV
            sheet.setColumnWidth(2, 30 * 256);  // Họ tên
            sheet.setColumnWidth(3, 16 * 256);  // Trạng thái
            sheet.setColumnWidth(4, 28 * 256);  // Thời gian

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    // ── Private Helpers ──────────────────────────────────────────────────────────

    private void writeInfoRow(Sheet sheet, int rowNum, String value, CellStyle style) {
        Row row = sheet.createRow(rowNum);
        Cell cell = row.createCell(0);
        cell.setCellValue(value);
        cell.setCellStyle(style);
        // Merge A đến E để hiển thị đẹp hơn
        sheet.addMergedRegion(new CellRangeAddress(rowNum, rowNum, 0, 4));
    }

    private void createCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }

    // ── Cell Style Factories ─────────────────────────────────────────────────────

    /**
     * Style cho dòng thông tin học phần: in đậm, font 12, border dưới mờ.
     */
    private CellStyle createHeaderInfoStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * Style cho header bảng dữ liệu: nền Light Blue, in đậm, căn giữa, có border.
     */
    private CellStyle createTableHeaderStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();

        // Nền Light Blue (#BDD7EE — màu chuẩn Excel "Light Blue")
        style.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 0xBD, (byte) 0xD7, (byte) 0xEE}, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorderThin(style);
        return style;
    }

    /**
     * Style bình thường cho dữ liệu: font 11, có border, căn trái.
     */
    private CellStyle createNormalStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorderThin(style);
        return style;
    }

    /**
     * Style cho sinh viên vắng mặt: chữ màu đỏ, in đậm, có border.
     */
    private CellStyle createAbsentStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setFontHeightInPoints((short) 11);
        font.setBold(true);
        font.setColor(IndexedColors.RED.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorderThin(style);
        return style;
    }

    private void setBorderThin(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }
}
