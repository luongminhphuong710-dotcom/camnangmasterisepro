/**
 * Cẩm nang Masterise – Đăng ký & duyệt gian hàng
 *
 * Google Form  →  Sheet "Duyệt gian hàng"  →  (Trạng thái = OK)  →  web camnangmasterise.vn
 *
 * - Có người gửi Form: thêm 1 dòng "Chờ duyệt" vào tab "Duyệt gian hàng" và gửi email báo ngay.
 * - Đổi cột Trạng thái thành "OK": tải ảnh lên web, đăng (hoặc cập nhật) gian hàng, ghi link vào dòng.
 * - Đổi thành "Gỡ khỏi web": xóa gian hàng do dòng đó tạo ra khỏi web.
 *
 * Cài đặt một lần: chạy hàm setup() và cấp quyền. Xem docs/store-submissions.md trong repo web.
 * Bản trong repo để SYNC_SECRET là "__SECRET__"; bản thật nằm trong Google Drive của Phương.
 */

var CONFIG = {
  SHEET_ID: '__SHEET_ID__',
  FOLDER_ID: '1B3lf-7at78zTn55XvGeslbXZ9aY-6ppW',
  API_BASE: 'https://www.camnangmasterise.vn/api/store-submissions',
  SYNC_SECRET: '__SECRET__',
  NOTIFY_EMAIL: 'luongminhphuong710@gmail.com',
  FORM_TITLE: 'Đăng ký gian hàng – Cẩm nang Masterise',
  REVIEW_SHEET: 'Duyệt gian hàng',
  RAW_SHEET: 'Dữ liệu Form (gốc)',
  GUIDE_SHEET: 'Hướng dẫn',
  MAX_DIRECT_UPLOAD_BYTES: 3.8 * 1024 * 1024
};

var Q = {
  NAME: 'Tên gian hàng',
  PROJECT: 'Dự án',
  CATEGORY: 'Loại hình',
  FLOOR: 'Vị trí trong dự án',
  HOURS: 'Giờ mở cửa',
  PHONE: 'Số điện thoại gian hàng',
  NOTE: 'Mô tả ngắn',
  DETAIL: 'Giới thiệu chi tiết',
  IMAGES: 'Ảnh gian hàng',
  IMAGE_LINKS: 'Link ảnh (nếu không tải ảnh lên được)',
  MAP: 'Link Google Maps',
  WEBSITE: 'Fanpage / Website',
  OFFER: 'Ưu đãi dành cho cư dân',
  OFFER_CODE: 'Mã ưu đãi',
  OFFER_EXP: 'Hạn ưu đãi',
  CONTACT: 'Người liên hệ',
  CONTACT_PHONE: 'SĐT người liên hệ',
  CONTACT_EMAIL: 'Email người liên hệ',
  CONSENT: 'Xác nhận'
};

// Cột của tab "Duyệt gian hàng" (1-based).
var COL = {
  ID: 1, SUBMITTED: 2, STATUS: 3, REVIEW_NOTE: 4, NAME: 5, PROJECT: 6, CATEGORY: 7, FLOOR: 8, HOURS: 9,
  PHONE: 10, NOTE: 11, DETAIL: 12, IMAGES: 13, MAP: 14, WEBSITE: 15, OFFER: 16, OFFER_CODE: 17, OFFER_EXP: 18,
  CONTACT: 19, CONTACT_PHONE: 20, CONTACT_EMAIL: 21, WEB_ID: 22, WEB_URL: 23, UPDATED: 24, RESULT: 25
};
var HEADERS = [
  'Mã đăng ký', 'Thời gian gửi', 'Trạng thái', 'Ghi chú duyệt', 'Tên gian hàng', 'Dự án', 'Loại hình',
  'Vị trí (tòa/tầng/căn)', 'Giờ mở cửa', 'SĐT gian hàng', 'Mô tả ngắn', 'Giới thiệu chi tiết', 'Ảnh (mỗi link một dòng)',
  'Link Google Maps', 'Fanpage / Website', 'Ưu đãi cho cư dân', 'Mã ưu đãi', 'Hạn ưu đãi', 'Người liên hệ',
  'SĐT người liên hệ', 'Email người liên hệ', 'ID trên web', 'Link trên web', 'Cập nhật lúc', 'Kết quả xử lý'
];
var STATUS = {
  PENDING: 'Chờ duyệt', OK: 'OK', FIX: 'Cần sửa', REJECT: 'Từ chối', WORKING: 'Đang đăng…',
  DONE: 'Đã đăng', ERROR: 'Lỗi', REMOVE: 'Gỡ khỏi web', REMOVED: 'Đã gỡ'
};
var STATUS_LIST = [STATUS.PENDING, STATUS.OK, STATUS.FIX, STATUS.REJECT, STATUS.WORKING, STATUS.DONE, STATUS.ERROR, STATUS.REMOVE, STATUS.REMOVED];

var FALLBACK_PROJECTS = [
  'Grand Marina, Saigon', 'HaNoi Seasons Garden', 'LUMIÈRE Evergreen', 'LUMIÈRE Midtown', 'LUMIÈRE Orient Pearl',
  'LUMIÈRE Riverside', 'Lumeire Ocean Crest', 'Masteri An Phú', 'Masteri Centre Point', 'Masteri Cosmo Central',
  'Masteri Era Landmark', 'Masteri Grand Coast', 'Masteri Lakeside', 'Masteri Rivera Danang', 'Masteri Trinity Square',
  'Masteri Waterfront', 'Masteri West Heights', 'The Global City'
];
var FALLBACK_CATEGORIES = ['Ăn uống', 'Mua sắm', 'Sức khỏe', 'Làm đẹp', 'Giáo dục', 'Dịch vụ', 'Gia đình'];

// ───────────────────────────── Cài đặt ─────────────────────────────

function setup() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  ensureReviewSheet_(ss);
  var options = fetchOptions_();
  var props = PropertiesService.getScriptProperties();

  var form = getForm_();
  if (!form) {
    form = buildForm_(options);
    props.setProperty('FORM_ID', form.getId());
    form.setDestination(FormApp.DestinationType.SPREADSHEET, CONFIG.SHEET_ID);
    DriveApp.getFileById(form.getId()).moveTo(DriveApp.getFolderById(CONFIG.FOLDER_ID));
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
    renameRawSheet_(ss, form);
  }
  applyOptions_(form, ss, options);
  installTriggers_(ss, form);
  writeGuideLinks_(ss, form);

  var message = 'Đã cài đặt xong.\nForm để gửi: ' + shortUrl_(form) + '\nForm để sửa: ' + form.getEditUrl() +
    '\nCòn 1 bước: mở Form để sửa, thêm câu hỏi "Tải tệp lên" tên đúng "' + Q.IMAGES + '" (xem tab Hướng dẫn).';
  Logger.log(message);
  return message;
}

function getForm_() {
  var id = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!id) return null;
  try { return FormApp.openById(id); } catch (err) { return null; }
}

function buildForm_(options) {
  var form = FormApp.create(CONFIG.FORM_TITLE);
  form.setDescription(
    'Đăng ký đưa gian hàng, dịch vụ của bạn lên Cẩm nang Masterise (camnangmasterise.vn) để cư dân dễ tìm thấy.\n' +
    'Chỉ mất khoảng 2 phút. Các mục có dấu * là bắt buộc. Thông tin được ban quản trị duyệt trước khi đăng.'
  );
  form.setConfirmationMessage('Cảm ơn bạn! Ban quản trị Cẩm nang Masterise sẽ duyệt và đăng gian hàng trong thời gian sớm nhất.');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(true);

  var phonePattern = FormApp.createTextValidation()
    .requireTextMatchesPattern('^[0-9 .+()\\-]{8,20}$')
    .setHelpText('Nhập số điện thoại hợp lệ, ví dụ 0912 345 678')
    .build();

  form.addSectionHeaderItem().setTitle('Thông tin gian hàng').setHelpText('Phần này sẽ hiển thị công khai trên web.');
  form.addTextItem().setTitle(Q.NAME).setHelpText('Ví dụ: Phở Quyên, Nha khoa Việt').setRequired(true);
  form.addListItem().setTitle(Q.PROJECT).setChoiceValues(options.projectNames).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.CATEGORY).setChoiceValues(options.categoryLabels).setRequired(true);
  form.addTextItem().setTitle(Q.FLOOR)
    .setHelpText('Tòa – tầng – số căn. Ví dụ: Shophouse SH05A, tầng 1 tòa M2').setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.HOURS)
    .setChoiceValues(['07:00 - 22:00', '08:00 - 20:00', '08:00 - 22:00', 'Mở cửa 24/7'])
    .showOtherOption(true).setRequired(true);
  form.addTextItem().setTitle(Q.PHONE).setHelpText('Số cư dân gọi khi cần. Để trống nếu không muốn hiện số.')
    .setValidation(phonePattern);
  form.addParagraphTextItem().setTitle(Q.NOTE).setHelpText('1–2 câu giới thiệu nhanh, tối đa khoảng 200 ký tự.').setRequired(true);
  form.addParagraphTextItem().setTitle(Q.DETAIL).setHelpText('Sản phẩm, dịch vụ nổi bật, điểm khác biệt… (không bắt buộc).');
  form.addParagraphTextItem().setTitle(Q.IMAGE_LINKS)
    .setHelpText('Dán link ảnh Google Drive hoặc link ảnh trên web, mỗi link một dòng (không bắt buộc).');
  form.addTextItem().setTitle(Q.MAP).setHelpText('Mở Google Maps → Chia sẻ → Sao chép đường liên kết (không bắt buộc).');
  form.addTextItem().setTitle(Q.WEBSITE).setHelpText('Link fanpage Facebook, Zalo OA hoặc website (không bắt buộc).');

  form.addSectionHeaderItem().setTitle('Ưu đãi cho cư dân (không bắt buộc)');
  form.addTextItem().setTitle(Q.OFFER).setHelpText('Ví dụ: Giảm 10% hóa đơn cho cư dân Masterise');
  form.addTextItem().setTitle(Q.OFFER_CODE).setHelpText('Để trống, hệ thống tự dùng mã CAMNANGMASTERISE');
  form.addTextItem().setTitle(Q.OFFER_EXP).setHelpText('Ví dụ: Đến 31/12/2026 hoặc Số lượng có hạn');

  form.addSectionHeaderItem().setTitle('Người đăng ký').setHelpText('Chỉ ban quản trị xem, không hiển thị trên web.');
  form.addTextItem().setTitle(Q.CONTACT).setRequired(true);
  form.addTextItem().setTitle(Q.CONTACT_PHONE).setValidation(phonePattern).setRequired(true);
  form.addTextItem().setTitle(Q.CONTACT_EMAIL).setValidation(
    FormApp.createTextValidation().requireTextIsEmail().setHelpText('Email chưa đúng định dạng').build()
  );
  form.addCheckboxItem().setTitle(Q.CONSENT)
    .setChoiceValues(['Tôi đồng ý để Cẩm nang Masterise đăng công khai thông tin và hình ảnh gian hàng ở trên'])
    .setRequired(true);
  return form;
}

function renameRawSheet_(ss, form) {
  var formId = form.getId();
  ss.getSheets().forEach(function (sheet) {
    var url = sheet.getFormUrl();
    if (url && url.indexOf(formId) !== -1 && sheet.getName() !== CONFIG.RAW_SHEET) {
      sheet.setName(CONFIG.RAW_SHEET);
      sheet.setTabColor('#9e9e9e');
    }
  });
}

function ensureReviewSheet_(ss) {
  var sheet = ss.getSheetByName(CONFIG.REVIEW_SHEET) || ss.insertSheet(CONFIG.REVIEW_SHEET, 0);
  if (sheet.getRange(1, 1).getValue() !== HEADERS[0]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_LIST, true).setAllowInvalid(false).build();
  sheet.getRange(2, COL.STATUS, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(statusRule);
  return sheet;
}

function installTriggers_(ss, form) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('onStoreFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('onReviewEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('processPendingRows').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('refreshOptions').timeBased().everyDays(1).atHour(6).create();
}

function writeGuideLinks_(ss, form) {
  var guide = ss.getSheetByName(CONFIG.GUIDE_SHEET);
  if (!guide) return;
  guide.getRange('B3').setValue(shortUrl_(form));
  guide.getRange('B4').setValue(form.getEditUrl());
}

function shortUrl_(form) {
  try { return form.shortenFormUrl(form.getPublishedUrl()); } catch (err) { return form.getPublishedUrl(); }
}

// ───────────────────────── Danh sách dự án / loại hình ─────────────────────────

function fetchOptions_() {
  var props = PropertiesService.getScriptProperties();
  try {
    var data = api_('options', null, 'get');
    var projectMap = {};
    data.projects.forEach(function (p) { projectMap[p.name] = p.id; });
    props.setProperty('PROJECT_MAP', JSON.stringify(projectMap));
    return {
      projectNames: data.projects.map(function (p) { return p.name; }),
      categoryLabels: data.categories.map(function (c) { return c.label; })
    };
  } catch (err) {
    Logger.log('Không lấy được danh sách từ web, dùng danh sách dự phòng: ' + err);
    return { projectNames: FALLBACK_PROJECTS, categoryLabels: FALLBACK_CATEGORIES };
  }
}

function refreshOptions() {
  var form = getForm_();
  if (!form) return;
  applyOptions_(form, SpreadsheetApp.openById(CONFIG.SHEET_ID), fetchOptions_());
}

function applyOptions_(form, ss, options) {
  form.getItems().forEach(function (item) {
    if (item.getTitle() === Q.PROJECT && item.getType() === FormApp.ItemType.LIST) {
      item.asListItem().setChoiceValues(options.projectNames);
    }
    if (item.getTitle() === Q.CATEGORY && item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      item.asMultipleChoiceItem().setChoiceValues(options.categoryLabels);
    }
  });
  var sheet = ss.getSheetByName(CONFIG.REVIEW_SHEET);
  if (!sheet) return;
  var rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, COL.PROJECT, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(options.projectNames, true).setAllowInvalid(true).build()
  );
  sheet.getRange(2, COL.CATEGORY, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(options.categoryLabels, true).setAllowInvalid(true).build()
  );
}

// ───────────────────────────── Nhận Form ─────────────────────────────

function onStoreFormSubmit(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var named = (e && e.namedValues) || {};
    var get = function (title) { return ((named[title] || [''])[0] || '').toString().trim(); };
    var sheet = ensureReviewSheet_(SpreadsheetApp.openById(CONFIG.SHEET_ID));
    var id = nextSubmissionId_();
    var images = extractLinks_(get(Q.IMAGES) + '\n' + get(Q.IMAGE_LINKS));

    var row = new Array(HEADERS.length).fill('');
    row[COL.ID - 1] = id;
    row[COL.SUBMITTED - 1] = new Date();
    row[COL.STATUS - 1] = STATUS.PENDING;
    row[COL.NAME - 1] = get(Q.NAME);
    row[COL.PROJECT - 1] = get(Q.PROJECT);
    row[COL.CATEGORY - 1] = get(Q.CATEGORY);
    row[COL.FLOOR - 1] = get(Q.FLOOR);
    row[COL.HOURS - 1] = get(Q.HOURS);
    row[COL.PHONE - 1] = asText_(get(Q.PHONE));
    row[COL.NOTE - 1] = get(Q.NOTE);
    row[COL.DETAIL - 1] = get(Q.DETAIL);
    row[COL.IMAGES - 1] = images.join('\n');
    row[COL.MAP - 1] = get(Q.MAP);
    row[COL.WEBSITE - 1] = get(Q.WEBSITE);
    row[COL.OFFER - 1] = get(Q.OFFER);
    row[COL.OFFER_CODE - 1] = get(Q.OFFER_CODE);
    row[COL.OFFER_EXP - 1] = get(Q.OFFER_EXP);
    row[COL.CONTACT - 1] = get(Q.CONTACT);
    row[COL.CONTACT_PHONE - 1] = asText_(get(Q.CONTACT_PHONE));
    row[COL.CONTACT_EMAIL - 1] = get(Q.CONTACT_EMAIL);
    sheet.appendRow(row);
    var rowIndex = sheet.getLastRow();
    sheet.getRange(rowIndex, COL.SUBMITTED).setNumberFormat('dd/MM/yyyy HH:mm');
    sendNewSubmissionEmail_(sheet, rowIndex, row, images.length);
  } finally {
    lock.releaseLock();
  }
}

function nextSubmissionId_() {
  var props = PropertiesService.getScriptProperties();
  var next = Number(props.getProperty('NEXT_ID') || '1');
  props.setProperty('NEXT_ID', String(next + 1));
  return 'GH-' + ('000' + next).slice(-4);
}

function asText_(value) {
  return value ? "'" + value : '';
}

function extractLinks_(text) {
  return String(text || '')
    .split(/[\s,]+/)
    .map(function (part) { return part.trim(); })
    .filter(function (part) { return /^https?:\/\//i.test(part); })
    .filter(function (part, index, list) { return list.indexOf(part) === index; });
}

function sendNewSubmissionEmail_(sheet, rowIndex, row, imageCount) {
  var link = sheet.getParent().getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + rowIndex;
  var lines = [
    ['Mã', row[COL.ID - 1]], ['Gian hàng', row[COL.NAME - 1]], ['Dự án', row[COL.PROJECT - 1]],
    ['Loại hình', row[COL.CATEGORY - 1]], ['Vị trí', row[COL.FLOOR - 1]], ['Giờ mở cửa', row[COL.HOURS - 1]],
    ['SĐT gian hàng', String(row[COL.PHONE - 1]).replace(/^'/, '')], ['Mô tả', row[COL.NOTE - 1]],
    ['Ảnh', imageCount + ' ảnh'], ['Ưu đãi', row[COL.OFFER - 1]],
    ['Người liên hệ', row[COL.CONTACT - 1] + ' – ' + String(row[COL.CONTACT_PHONE - 1]).replace(/^'/, '')]
  ];
  var table = lines.map(function (line) {
    return '<tr><td style="padding:4px 12px 4px 0;color:#666">' + escape_(line[0]) + '</td><td style="padding:4px 0"><b>' +
      escape_(line[1] || '—') + '</b></td></tr>';
  }).join('');
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px">' +
    '<p>Có gian hàng mới đăng ký trên Cẩm nang Masterise, đang chờ bạn duyệt.</p>' +
    '<table>' + table + '</table>' +
    '<p style="margin-top:16px"><a href="' + link + '" style="background:#0b3b60;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Mở dòng để duyệt</a></p>' +
    '<p style="color:#666">Đổi cột <b>Trạng thái</b> thành <b>OK</b> để đăng lên web ngay.</p></div>';
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    subject: '[Cẩm nang] Gian hàng mới chờ duyệt: ' + row[COL.NAME - 1] + ' (' + row[COL.PROJECT - 1] + ')',
    htmlBody: html,
    name: 'Cẩm nang Masterise'
  });
}

// ───────────────────────────── Duyệt & đăng ─────────────────────────────

function onReviewEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.REVIEW_SHEET) return;
  var firstCol = e.range.getColumn();
  var lastCol = firstCol + e.range.getNumColumns() - 1;
  if (COL.STATUS < firstCol || COL.STATUS > lastCol) return;
  processPendingRows();
}

function processPendingRows() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.REVIEW_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return;
    var statuses = sheet.getRange(2, COL.STATUS, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < statuses.length; i++) {
      var status = String(statuses[i][0]).trim();
      if (status === STATUS.OK) publishRow_(sheet, i + 2);
      else if (status === STATUS.REMOVE) unpublishRow_(sheet, i + 2);
    }
  } finally {
    lock.releaseLock();
  }
}

function publishRow_(sheet, rowIndex) {
  var values = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getDisplayValues()[0];
  var cell = function (col) { return String(values[col - 1] || '').trim(); };
  sheet.getRange(rowIndex, COL.STATUS).setValue(STATUS.WORKING);
  SpreadsheetApp.flush();
  try {
    if (!cell(COL.ID)) {
      var newId = nextSubmissionId_();
      sheet.getRange(rowIndex, COL.ID).setValue(newId);
      values[COL.ID - 1] = newId;
    }
    if (!cell(COL.NAME) || !cell(COL.PROJECT) || !cell(COL.CATEGORY)) {
      throw new Error('Thiếu Tên gian hàng, Dự án hoặc Loại hình.');
    }
    var images = extractLinks_(cell(COL.IMAGES)).map(uploadImage_);
    var projectMap = JSON.parse(PropertiesService.getScriptProperties().getProperty('PROJECT_MAP') || '{}');
    var result = api_('publish', {
      submissionId: cell(COL.ID),
      store: {
        name: cell(COL.NAME),
        project: projectMap[cell(COL.PROJECT)] || cell(COL.PROJECT),
        category: cell(COL.CATEGORY),
        floor: cell(COL.FLOOR),
        hours: cell(COL.HOURS),
        phone: cell(COL.PHONE),
        note: cell(COL.NOTE),
        detail: cell(COL.DETAIL),
        website: cell(COL.WEBSITE),
        mapUrl: cell(COL.MAP),
        images: images,
        voucher: { description: cell(COL.OFFER), code: cell(COL.OFFER_CODE), expires: cell(COL.OFFER_EXP) }
      }
    });
    sheet.getRange(rowIndex, COL.WEB_ID, 1, 4).setValues([[
      result.storeId, result.url, new Date(),
      (result.created ? 'Đã tạo mới trên web' : 'Đã cập nhật trên web') + ' (' + result.images + ' ảnh)'
    ]]);
    sheet.getRange(rowIndex, COL.UPDATED).setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange(rowIndex, COL.STATUS).setValue(STATUS.DONE);
  } catch (err) {
    var message = String(err && err.message ? err.message : err);
    sheet.getRange(rowIndex, COL.RESULT).setValue('Lỗi: ' + message);
    sheet.getRange(rowIndex, COL.UPDATED).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange(rowIndex, COL.STATUS).setValue(STATUS.ERROR);
    notifyError_(cell(COL.ID), cell(COL.NAME), message);
  }
  SpreadsheetApp.flush();
}

function unpublishRow_(sheet, rowIndex) {
  var id = String(sheet.getRange(rowIndex, COL.ID).getValue()).trim();
  try {
    var result = api_('unpublish', { submissionId: id });
    sheet.getRange(rowIndex, COL.RESULT).setValue(result.removed ? 'Đã gỡ khỏi web' : (result.message || 'Không có trên web'));
    sheet.getRange(rowIndex, COL.WEB_URL).setValue('');
    sheet.getRange(rowIndex, COL.UPDATED).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange(rowIndex, COL.STATUS).setValue(STATUS.REMOVED);
  } catch (err) {
    sheet.getRange(rowIndex, COL.RESULT).setValue('Lỗi khi gỡ: ' + (err && err.message ? err.message : err));
    sheet.getRange(rowIndex, COL.STATUS).setValue(STATUS.ERROR);
  }
}

// Ảnh trên Google Drive được tải lên web (Cloudinary) một lần; link Cloudinary được nhớ lại
// để lần duyệt sau (cập nhật) không tải lại. Link ảnh khác để web tự tải.
function uploadImage_(link) {
  var driveId = driveIdFromUrl_(link);
  if (!driveId) return link;
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('img:' + driveId);
  if (cached) return cached;

  var file = DriveApp.getFileById(driveId);
  var blob = file.getBlob();
  if (blob.getBytes().length > CONFIG.MAX_DIRECT_UPLOAD_BYTES) blob = driveThumbnail_(driveId, file.getName());
  var response = UrlFetchApp.fetch(CONFIG.API_BASE + '?action=upload-image', {
    method: 'post',
    headers: { 'x-store-sync-secret': CONFIG.SYNC_SECRET },
    payload: { file: blob, name: file.getName() },
    muteHttpExceptions: true
  });
  var data = parseResponse_(response);
  props.setProperty('img:' + driveId, data.url);
  return data.url;
}

function driveThumbnail_(driveId, name) {
  var token = ScriptApp.getOAuthToken();
  var meta = JSON.parse(UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + driveId + '?fields=thumbnailLink',
    { headers: { Authorization: 'Bearer ' + token } }
  ).getContentText());
  if (!meta.thumbnailLink) throw new Error('Ảnh "' + name + '" lớn hơn 4MB và chưa có bản thu nhỏ. Thử lại sau vài phút.');
  var url = meta.thumbnailLink.replace(/=s\d+$/, '=s1600');
  return UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token } }).getBlob().setName(name);
}

function driveIdFromUrl_(link) {
  if (!/drive\.google\.com|docs\.google\.com/i.test(link)) return '';
  var match = link.match(/[?&]id=([\w-]{10,})/) || link.match(/\/d\/([\w-]{10,})/);
  return match ? match[1] : '';
}

// ───────────────────────────── Tiện ích ─────────────────────────────

function api_(action, body, method) {
  var options = {
    method: method || 'post',
    headers: { 'x-store-sync-secret': CONFIG.SYNC_SECRET },
    muteHttpExceptions: true
  };
  if (body) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
  }
  return parseResponse_(UrlFetchApp.fetch(CONFIG.API_BASE + '?action=' + action, options));
}

function parseResponse_(response) {
  var code = response.getResponseCode();
  var text = response.getContentText();
  var data;
  try { data = JSON.parse(text); } catch (err) { data = { message: text.slice(0, 300) }; }
  if (code >= 300) throw new Error(data.message || ('Web trả lỗi HTTP ' + code));
  return data;
}

function notifyError_(id, name, message) {
  try {
    MailApp.sendEmail({
      to: CONFIG.NOTIFY_EMAIL,
      subject: '[Cẩm nang] Lỗi khi đăng gian hàng ' + name + ' (' + id + ')',
      htmlBody: '<p>Không đăng được gian hàng <b>' + escape_(name) + '</b>.</p><p>Lý do: ' + escape_(message) +
        '</p><p>Sửa dòng trong Sheet rồi đổi Trạng thái về <b>OK</b> để thử lại.</p>',
      name: 'Cẩm nang Masterise'
    });
  } catch (err) {
    Logger.log(err);
  }
}

function escape_(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
