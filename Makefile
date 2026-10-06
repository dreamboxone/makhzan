# Makhzan - USB NAS manager for OpenWrt
# Copyright (C) 2026 dreamboxone
# SPDX-License-Identifier: GPL-3.0-only
#
# This program is free software: you can redistribute it and/or modify it under the terms
# of the GNU General Public License version 3 as published by the Free Software Foundation.
# It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-makhzan
PKG_VERSION:=2.0.1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=dreamboxone

include $(INCLUDE_DIR)/package.mk

# The view is installed under a build-stamped name so browsers never run a cached page from an older release.
MAKHZAN_BUILD:=$(PKG_VERSION)-$(PKG_RELEASE)
MAKHZAN_VIEW:=overview_$(subst .,_,$(PKG_VERSION))_$(PKG_RELEASE)
MAKHZAN_CALENDAR:=calendar_$(subst .,_,$(PKG_VERSION))_$(PKG_RELEASE)

define Package/luci-app-makhzan
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=Makhzan USB NAS manager
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +rpcd-mod-file +block-mount +e2fsprogs +parted +swap-utils +curl +ca-bundle +jshn
endef

define Package/luci-app-makhzan/description
LuCI-managed USB NAS: USB disk planner (NAS, swap, extroot), private per-user SMB
folders with login lockout, shared and media folders, and MiniDLNA integration.
Architecture independent.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Compile
endef

define Package/luci-app-makhzan/conffiles
/etc/config/makhzan
endef

define Package/luci-app-makhzan/install
	$(INSTALL_DIR) $(1)/etc/config $(1)/etc/init.d $(1)/usr/sbin $(1)/usr/libexec $(1)/usr/share/licenses/makhzan
	$(INSTALL_CONF) ./files/etc/config/makhzan $(1)/etc/config/makhzan
	$(INSTALL_BIN) ./files/etc/init.d/makhzan $(1)/etc/init.d/makhzan
	$(INSTALL_BIN) ./files/usr/sbin/makhzanctl $(1)/usr/sbin/makhzanctl
	$(INSTALL_BIN) ./files/usr/libexec/makhzan-storage $(1)/usr/libexec/makhzan-storage
	$(INSTALL_BIN) ./files/usr/libexec/makhzan-remote $(1)/usr/libexec/makhzan-remote
	$(INSTALL_BIN) ./files/usr/libexec/makhzan-download $(1)/usr/libexec/makhzan-download
	$(INSTALL_BIN) ./files/etc/init.d/makhzan-download $(1)/etc/init.d/makhzan-download
	$(INSTALL_DIR) $(1)/etc/hotplug.d/ntp
	$(INSTALL_DATA) ./files/etc/hotplug.d/ntp/90-makhzan-clock $(1)/etc/hotplug.d/ntp/90-makhzan-clock
	$(INSTALL_DATA) ./files/usr/libexec/makhzan-usb.sh $(1)/usr/libexec/makhzan-usb.sh
	$(INSTALL_DATA) ./LICENSE $(1)/usr/share/licenses/makhzan/LICENSE
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/luci-app-makhzan.json $(1)/usr/share/rpcd/acl.d/luci-app-makhzan.json
	sed 's|"makhzan/overview"|"makhzan/$(MAKHZAN_VIEW)"|' ./files/usr/share/luci/menu.d/luci-app-makhzan.json > $(1)/usr/share/luci/menu.d/luci-app-makhzan.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/makhzan/fonts
	sed -e 's|@MAKHZAN_BUILD@|$(MAKHZAN_BUILD)|g' -e 's|view.makhzan.calendar as|view.makhzan.$(MAKHZAN_CALENDAR) as|' ./files/www/luci-static/resources/view/makhzan/overview.js > $(1)/www/luci-static/resources/view/makhzan/$(MAKHZAN_VIEW).js
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/makhzan/theme.css $(1)/www/luci-static/resources/view/makhzan/theme.css
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/makhzan/calendar.js $(1)/www/luci-static/resources/view/makhzan/$(MAKHZAN_CALENDAR).js
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/makhzan/fonts/* $(1)/www/luci-static/resources/view/makhzan/fonts/
endef

define Package/luci-app-makhzan/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -f /tmp/luci-indexcache* 2>/dev/null
	rm -rf /tmp/luci-modulecache 2>/dev/null
	/etc/init.d/rpcd reload >/dev/null 2>&1
	# OpenWrt's default_postinst then runs /etc/init.d/makhzan start, which restores saved shares,
	# the lockout policy and DLNA after a reinstall or upgrade (a no-op until Makhzan was applied once).
}
exit 0
endef

define Package/luci-app-makhzan/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || [ "$${PKG_UPGRADE}" = 1 ] || /usr/sbin/makhzanctl uninstall >/dev/null 2>&1
exit 0
endef

$(eval $(call BuildPackage,luci-app-makhzan))
