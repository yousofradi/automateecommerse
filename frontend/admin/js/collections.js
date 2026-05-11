document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  loadCollections();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.collection-row:not(.header)').forEach(row => {
        const name = row.getAttribute('data-name');
        row.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }
});

async function loadCollections() {
  const list = document.getElementById('collections-list');
  try {
    const [cols, productsRes] = await Promise.all([
      api.getCollections(),
      api.getProducts(1, 1000, true) // Fetch many products to get accurate counts
    ]);
    
    const products = (Array.isArray(productsRes) ? productsRes : productsRes.products || []).filter(p => p.status !== 'draft');
    const counts = {};
    products.forEach(p => {
      if (p.collectionId) {
        counts[p.collectionId] = (counts[p.collectionId] || 0) + 1;
      }
      if (Array.isArray(p.collectionIds)) {
        p.collectionIds.forEach(cid => {
          counts[cid] = (counts[cid] || 0) + 1;
        });
      }
    });

    if (!cols.length) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:#666">لا توجد تصنيفات بعد</div>';
      return;
    }

    list.innerHTML = cols.map(c => `
      <div class="collection-row" data-name="${c.name.toLowerCase()}" style="grid-template-columns: 50px 80px 1fr 80px;" onclick="if(!event.target.closest('.action-menu') && !event.target.closest('.action-dropdown') && !event.target.closest('input[type=checkbox]')) window.location.href='collection-form?id=${c._id}'">
        <div style="text-align: center;"><input type="checkbox" class="collection-checkbox" data-id="${c._id}" onchange="updateBulkBar()"></div>
        <div style="display:flex; justify-content:center;">
          ${c.imageUrl 
            ? `<img src="${c.imageUrl}" class="collection-img" alt="${c.name}">`
            : `<div class="collection-img-placeholder">بدون صورة</div>`
          }
        </div>
        <div style="font-weight:600; text-align:center; font-size:1rem;">${c.name}</div>
        <div style="text-align:center;position:relative">
          <div class="action-menu" onclick="event.stopPropagation(); toggleMenu('${c._id}')">⋮</div>
          <div id="menu-${c._id}" class="action-dropdown hidden" style="position:absolute;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:100;padding:4px;min-width:120px;">
            <a href="collection-form?id=${c._id}" style="display:flex; align-items:center; gap:8px; padding:10px 14px; color:#333; text-decoration:none; border-radius:6px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              تعديل
            </a>
            <div style="cursor:pointer;padding:10px 14px;color:#ef4444;border-radius:6px;" onclick="deleteCol('${c._id}')" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background=''"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> حذف</div>
          </div>
        </div>
      </div>
    `).join('');
    
    unselectAll();
  } catch (e) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:red">فشل تحميل التصنيفات</div>';
  }
}

function toggleMenu(id) {
  document.querySelectorAll('.action-dropdown').forEach(m => m.classList.add('hidden'));
  const menu = document.getElementById(`menu-${id}`);
  if (menu) menu.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.action-menu')) {
    document.querySelectorAll('.action-dropdown').forEach(m => m.classList.add('hidden'));
  }
});

async function deleteCol(id) {
  const confirmed = await window.showConfirmModal('تأكيد الحذف', 'هل أنت متأكد من حذف هذا التصنيف؟');
  if (!confirmed) return;
  try {
    await api.deleteCollection(id);
    showToast('تم الحذف بنجاح');
    loadCollections();
  } catch (e) {
    showToast('فشل الحذف', 'error');
  }
}

// ── Bulk Actions ──────────────────────────────────────────

window.toggleSelectAll = function() {
  const master = document.getElementById('select-all-collections');
  const checkboxes = document.querySelectorAll('.collection-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = master.checked;
  });
  updateBulkBar();
};

window.updateBulkBar = function() {
  const bar = document.getElementById('bulk-actions-bar');
  const selected = document.querySelectorAll('.collection-checkbox:checked');
  const badge = document.getElementById('selected-count-badge');
  
  if (selected.length > 0) {
    bar.style.display = 'flex';
    badge.innerText = selected.length;
  } else {
    bar.style.display = 'none';
  }
  
  const master = document.getElementById('select-all-collections');
  const all = document.querySelectorAll('.collection-checkbox');
  if (master) {
    master.checked = all.length > 0 && selected.length === all.length;
    master.indeterminate = selected.length > 0 && selected.length < all.length;
  }
};

window.unselectAll = function() {
  const checkboxes = document.querySelectorAll('.collection-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  const master = document.getElementById('select-all-collections');
  if (master) {
    master.checked = false;
    master.indeterminate = false;
  }
  updateBulkBar();
};

window.bulkDelete = async function() {
  const selected = document.querySelectorAll('.collection-checkbox:checked');
  const ids = Array.from(selected).map(cb => cb.getAttribute('data-id'));
  
  if (ids.length === 0) return;
  
  const confirmed = await window.showConfirmModal('تأكيد الحذف', `هل أنت متأكد من حذف ${ids.length} تصنيفات نهائياً؟`);
  if (!confirmed) return;
  
  try {
    await api.deleteCollectionsBatch(ids);
    showToast('تم حذف التصنيفات بنجاح');
    loadCollections();
  } catch (err) {
    showToast(err.message || 'فشل حذف التصنيفات', 'error');
  }
};
