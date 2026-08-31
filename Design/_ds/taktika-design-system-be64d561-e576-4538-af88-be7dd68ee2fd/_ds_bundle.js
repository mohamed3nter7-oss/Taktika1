/* @ds-bundle: {"format":4,"namespace":"TaktikaDesignSystem_be64d5","components":[{"name":"PostCard","sourcePath":"components/content/PostCard.jsx"},{"name":"ProfileHeader","sourcePath":"components/content/ProfileHeader.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardDivider","sourcePath":"components/core/Card.jsx"},{"name":"EmptyState","sourcePath":"components/core/EmptyState.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Skeleton","sourcePath":"components/core/Skeleton.jsx"},{"name":"SkeletonPost","sourcePath":"components/core/Skeleton.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"ToastStack","sourcePath":"components/feedback/Toast.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Avatar","sourcePath":"components/identity/Avatar.jsx"},{"name":"ClubCrest","sourcePath":"components/identity/ClubCrest.jsx"},{"name":"PositionChip","sourcePath":"components/identity/PositionChip.jsx"},{"name":"RoleBadge","sourcePath":"components/identity/RoleBadge.jsx"},{"name":"ROLE_CONFIG","sourcePath":"components/identity/roleConfig.js"},{"name":"BottomTabBar","sourcePath":"components/navigation/BottomTabBar.jsx"},{"name":"LeftRail","sourcePath":"components/navigation/LeftRail.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"}],"sourceHashes":{"components/content/PostCard.jsx":"4a67d561024c","components/content/ProfileHeader.jsx":"54b5d1465b26","components/core/Badge.jsx":"7ce3176f0a43","components/core/Button.jsx":"ccdd1935a9dc","components/core/Card.jsx":"6f517a7b2ac2","components/core/EmptyState.jsx":"b3060bcefdda","components/core/Icon.jsx":"de2088050452","components/core/IconButton.jsx":"59d9b8875634","components/core/Skeleton.jsx":"90f72d780bc4","components/feedback/Modal.jsx":"2baa5d791fc9","components/feedback/Toast.jsx":"1df450ab7b04","components/forms/Input.jsx":"7dd3f37ae249","components/forms/Select.jsx":"bd3d59c5b51a","components/forms/Textarea.jsx":"881a87b81aa8","components/identity/Avatar.jsx":"df25cd0c968a","components/identity/ClubCrest.jsx":"afe6a59946c2","components/identity/PositionChip.jsx":"3194da3c74ff","components/identity/RoleBadge.jsx":"4617ee19429b","components/identity/roleConfig.js":"d660200e8fcc","components/navigation/BottomTabBar.jsx":"146a48fc4851","components/navigation/LeftRail.jsx":"8c5c1727c32a","components/navigation/Tabs.jsx":"48cb057b751c","components/navigation/TopNav.jsx":"a29b732ae768","ui_kits/web-app/App.jsx":"99eed5637fdc","ui_kits/web-app/Feed.jsx":"b776801f790f","ui_kits/web-app/Messages.jsx":"05624ce6e236","ui_kits/web-app/Profile.jsx":"5fba3ebbb2f2","ui_kits/web-app/Search.jsx":"39f9046124c4","ui_kits/web-app/Shell.jsx":"44b1ea4b5f6d","ui_kits/web-app/data.js":"8b4257bdc2de"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TaktikaDesignSystem_be64d5 = window.TaktikaDesignSystem_be64d5 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Base container: --surface-raised, 1px --border-default, 12px radius, 20px padding. */
function Card({
  interactive = false,
  padding = 'var(--space-5)',
  as: Tag = 'div',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement(Tag, _extends({
    onMouseEnter: interactive ? () => setHover(true) : undefined,
    onMouseLeave: interactive ? () => setHover(false) : undefined,
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid ' + (interactive && hover ? 'var(--border-strong)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-lg)',
      padding,
      transition: interactive ? 'border-color var(--duration-fast) var(--ease-in-out)' : undefined,
      cursor: interactive ? 'pointer' : undefined,
      ...style
    }
  }, rest), children);
}

/** --border-subtle rule. Use instead of nesting a second Card. */
function CardDivider({
  inset = 'var(--space-5)',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: 'var(--space-4) calc(' + inset + ' * -1)',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Card, CardDivider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = 'https://unpkg.com/lucide-static@0.544.0/icons/';

/** Lucide glyph rendered as a CSS mask, so it always inherits currentColor. */
function Icon({
  name,
  size = 18,
  color,
  label,
  style,
  ...rest
}) {
  const url = 'url(' + BASE + name + '.svg)';
  return /*#__PURE__*/React.createElement("span", _extends({
    role: label ? 'img' : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : 'true',
    style: {
      display: 'inline-block',
      flex: '0 0 auto',
      width: size,
      height: size,
      backgroundColor: color || 'currentColor',
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  neutral: {
    background: 'var(--surface-sunken)',
    color: 'var(--text-secondary)'
  },
  success: {
    background: 'var(--color-success-tint)',
    color: 'var(--color-success-text)'
  },
  danger: {
    background: 'var(--color-danger-tint)',
    color: 'var(--color-danger-text)'
  },
  warning: {
    background: 'var(--color-warning-tint)',
    color: 'var(--color-warning-text)'
  },
  info: {
    background: 'var(--color-info-tint)',
    color: 'var(--color-info-text)'
  }
};

/** Generic non-role status label: Verified, Current club, Open to trials. */
function Badge({
  variant = 'neutral',
  icon,
  children,
  style,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--text-xs-size)',
      lineHeight: 'var(--text-xs-lh)',
      fontWeight: 'var(--weight-medium)',
      whiteSpace: 'nowrap',
      ...v,
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 12
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 32,
    padding: '0 12px',
    fontSize: 'var(--text-sm-size)',
    icon: 16
  },
  md: {
    height: 40,
    padding: '0 16px',
    fontSize: 'var(--text-body-size)',
    icon: 18
  },
  lg: {
    height: 48,
    padding: '0 24px',
    fontSize: 'var(--text-body-size)',
    icon: 20
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--text-on-accent)',
    border: '1px solid transparent',
    hover: {
      background: 'var(--color-accent-hover)'
    },
    active: {
      background: 'var(--color-accent-pressed)'
    }
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-strong)',
    hover: {
      background: 'var(--surface-raised)'
    },
    active: {}
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    hover: {
      background: 'var(--surface-raised)',
      color: 'var(--text-primary)'
    },
    active: {}
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#FFFFFF',
    border: '1px solid transparent',
    hover: {
      background: '#E33B3B'
    },
    active: {
      background: '#B91C1C'
    }
  },
  link: {
    background: 'transparent',
    color: 'var(--color-accent-text)',
    border: '1px solid transparent',
    hover: {
      textDecoration: 'underline'
    },
    active: {}
  }
};

/** One filled accent Button per view. secondary is the default choice. */
function Button({
  variant = 'secondary',
  size = 'md',
  iconStart,
  iconEnd,
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const off = disabled || loading;
  const link = variant === 'link';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: off,
    "aria-busy": loading || undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      height: link ? 'auto' : s.height,
      padding: link ? 0 : s.padding,
      fontFamily: 'inherit',
      fontSize: s.fontSize,
      fontWeight: 'var(--weight-medium)',
      lineHeight: 1,
      letterSpacing: 0,
      whiteSpace: 'nowrap',
      borderRadius: link ? 0 : 'var(--radius-md)',
      background: v.background,
      color: v.color,
      border: v.border,
      cursor: off ? 'not-allowed' : 'pointer',
      transition: 'background-color var(--duration-fast) var(--ease-in-out), color var(--duration-fast) var(--ease-in-out), border-color var(--duration-fast) var(--ease-in-out), transform var(--duration-fast) var(--ease-in-out)',
      transform: press && !off ? 'scale(0.98)' : 'none',
      ...(hover && !off ? v.hover : null),
      ...(press && !off ? v.active : null),
      ...(off ? {
        background: 'var(--surface-sunken)',
        color: 'var(--text-muted)',
        borderColor: 'transparent'
      } : null),
      ...style
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(Spinner, {
    size: s.icon
  }) : iconStart ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconStart,
    size: s.icon
  }) : null, loading ? null : /*#__PURE__*/React.createElement("span", null, children), !loading && iconEnd ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconEnd,
    size: s.icon
  }) : null);
}
function Spinner({
  size
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      display: 'inline-block',
      borderRadius: 'var(--radius-full)',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      animation: 'tk-spin 700ms linear infinite'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes tk-spin{to{transform:rotate(360deg)}}'));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** An invitation, not an apology: name the space, one line, one action. */
function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: 'var(--space-12) var(--space-6)',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 48,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-h3-size)',
      lineHeight: 'var(--text-h3-lh)',
      fontWeight: 'var(--weight-medium)'
    }
  }, title), description ? /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 320,
      fontSize: 'var(--text-body-size)',
      lineHeight: 'var(--text-body-lh)',
      color: 'var(--text-secondary)',
      textWrap: 'pretty'
    }
  }, description) : null, action ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--space-3)'
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    box: 32,
    icon: 16
  },
  md: {
    box: 40,
    icon: 20
  },
  lg: {
    box: 44,
    icon: 24
  }
};
const VARIANTS = {
  ghost: {
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    hover: {
      background: 'var(--surface-raised)',
      color: 'var(--text-primary)'
    }
  },
  secondary: {
    color: 'var(--text-primary)',
    border: '1px solid var(--border-strong)',
    hover: {
      background: 'var(--surface-raised)'
    }
  },
  danger: {
    color: 'var(--color-danger-text)',
    border: '1px solid transparent',
    hover: {
      background: 'var(--color-danger-tint)'
    }
  }
};

/** Square icon-only button. label is mandatory — an unlabelled icon is a guess. */
function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  active = false,
  disabled = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    title: label,
    "aria-label": label,
    "aria-pressed": active || undefined,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: s.box,
      height: s.box,
      flex: '0 0 auto',
      padding: 0,
      borderRadius: 'var(--radius-full)',
      background: 'transparent',
      color: active ? 'var(--color-accent-text)' : v.color,
      border: v.border,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background-color var(--duration-fast) var(--ease-in-out), color var(--duration-fast) var(--ease-in-out), transform var(--duration-fast) var(--ease-in-out)',
      transform: press && !disabled ? 'scale(0.98)' : 'none',
      ...(hover && !disabled ? v.hover : null),
      ...(disabled ? {
        background: 'var(--surface-sunken)',
        color: 'var(--text-muted)'
      } : null),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Placeholder matching the SHAPE of the content it replaces. */
function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--radius-sm)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "aria-hidden": "true",
    style: {
      width,
      height,
      borderRadius: radius,
      background: 'var(--surface-sunken)',
      animation: 'tk-pulse 300ms var(--ease-in-out) infinite alternate',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("style", null, '@keyframes tk-pulse{from{opacity:.5}to{opacity:1}}'));
}

/** Post-shaped skeleton: avatar, two metadata lines, three body lines. */
function SkeletonPost({
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    width: 40,
    height: 40,
    radius: "var(--radius-full)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    width: 140,
    height: 14
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: 96,
    height: 12
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      marginBlockStart: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    height: 14
  }), /*#__PURE__*/React.createElement(Skeleton, {
    height: 14
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "62%",
    height: 14
  })));
}
Object.assign(__ds_scope, { Skeleton, SkeletonPost });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
const WIDTHS = {
  sm: 400,
  md: 560,
  lg: 720
};

/** Dialog with focus trap, Escape close, scroll lock and focus return. */
function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children
}) {
  const panelRef = React.useRef(null);
  const openerRef = React.useRef(null);
  const titleId = React.useId();
  React.useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current && panelRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(n => !n.disabled);
      if (!nodes.length) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (openerRef.current && openerRef.current.focus) openerRef.current.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose && onClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 'var(--z-modal)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      background: 'var(--scrim-modal)',
      animation: 'tk-fade var(--duration-slow) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes tk-fade{from{opacity:0}to{opacity:1}}@keyframes tk-pop{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}'), /*#__PURE__*/React.createElement("div", {
    ref: panelRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": titleId,
    style: {
      width: '100%',
      maxWidth: WIDTHS[size] || WIDTHS.md,
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-overlay)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      animation: 'tk-pop var(--duration-slow) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)',
      padding: 'var(--space-6)',
      paddingBlockEnd: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    id: titleId,
    style: {
      margin: 0,
      fontSize: 'var(--text-h3-size)',
      lineHeight: 'var(--text-h3-lh)',
      fontWeight: 'var(--weight-medium)'
    }
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-2) 0 0',
      fontSize: 'var(--text-body-size)',
      color: 'var(--text-secondary)',
      textWrap: 'pretty'
    }
  }, description) : null), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close dialog",
    size: "sm",
    onClick: onClose
  })), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--space-6)',
      overflowY: 'auto'
    }
  }, children) : null, footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      padding: 'var(--space-6)'
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const VARIANTS = {
  success: {
    border: 'var(--color-success)',
    icon: 'circle-check',
    color: 'var(--color-success-text)'
  },
  danger: {
    border: 'var(--color-danger)',
    icon: 'circle-alert',
    color: 'var(--color-danger-text)'
  },
  warning: {
    border: 'var(--color-warning)',
    icon: 'triangle-alert',
    color: 'var(--color-warning-text)'
  },
  info: {
    border: 'var(--color-info)',
    icon: 'info',
    color: 'var(--color-info-text)'
  }
};

/** Single toast. Errors persist until dismissed; everything else auto-dismisses at 4s. */
function Toast({
  variant = 'info',
  title,
  description,
  onDismiss,
  style
}) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const assertive = variant === 'danger';
  return /*#__PURE__*/React.createElement("div", {
    role: assertive ? 'alert' : 'status',
    "aria-live": assertive ? 'assertive' : 'polite',
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      width: '100%',
      maxWidth: 360,
      padding: 'var(--space-4)',
      background: 'var(--surface-overlay)',
      border: '1px solid ' + v.border,
      borderRadius: 'var(--radius-lg)',
      animation: 'tk-toast var(--duration-base) var(--ease-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes tk-toast{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}'), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: v.icon,
    size: 18,
    color: v.color,
    style: {
      marginBlockStart: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, title), description ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-secondary)',
      textWrap: 'pretty'
    }
  }, description) : null), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Dismiss",
    size: "sm",
    onClick: onDismiss
  }));
}

/** Fixed stack, bottom inline-end, maximum three; the oldest goes first. */
function ToastStack({
  toasts = [],
  onDismiss,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      insetBlockEnd: 'var(--space-6)',
      insetInlineEnd: 'var(--space-6)',
      zIndex: 'var(--z-toast)',
      display: 'grid',
      gap: 'var(--space-3)',
      justifyItems: 'end',
      ...style
    }
  }, toasts.slice(-3).map(t => /*#__PURE__*/React.createElement(Toast, {
    key: t.id,
    variant: t.variant,
    title: t.title,
    description: t.description,
    onDismiss: () => onDismiss && onDismiss(t.id)
  })));
}
Object.assign(__ds_scope, { Toast, ToastStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const fieldStyle = (state, disabled) => ({
  width: '100%',
  height: 40,
  padding: '0 var(--space-3)',
  background: disabled ? 'var(--surface-base)' : 'var(--surface-sunken)',
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  border: '1px solid ' + state,
  borderRadius: 'var(--radius-md)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-body-size)',
  lineHeight: 'var(--text-body-lh)',
  textAlign: 'start',
  outline: 'none',
  transition: 'border-color var(--duration-fast) var(--ease-in-out)'
});

/** Labelled text field. The label is always visible — a placeholder is not a label. */
function Input({
  label,
  id,
  value,
  onChange,
  placeholder,
  helper,
  error,
  iconStart,
  type = 'text',
  required = false,
  disabled = false,
  numeric = false,
  style,
  ...rest
}) {
  const auto = React.useId();
  const fieldId = id || auto;
  const [hover, setHover] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const border = error ? 'var(--color-danger)' : focus ? 'var(--border-accent)' : hover ? 'var(--border-strong)' : disabled ? 'var(--border-subtle)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--text-sm-size)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--text-secondary)'
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--text-muted)'
    }
  }, " (required)") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, iconStart ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconStart,
    size: 16,
    color: "var(--text-muted)",
    style: {
      position: 'absolute',
      insetInlineStart: 'var(--space-3)',
      pointerEvents: 'none'
    }
  }) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    required: required,
    disabled: disabled,
    dir: numeric ? 'ltr' : undefined,
    "aria-invalid": error ? 'true' : undefined,
    "aria-describedby": error || helper ? fieldId + '-desc' : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...fieldStyle(border, disabled),
      paddingInlineStart: iconStart ? 'var(--space-8)' : 'var(--space-3)'
    }
  }, rest))), error || helper ? /*#__PURE__*/React.createElement("div", {
    id: fieldId + '-desc',
    style: {
      fontSize: 'var(--text-sm-size)',
      lineHeight: 'var(--text-sm-lh)',
      color: error ? 'var(--color-danger-text)' : 'var(--text-secondary)'
    }
  }, error || helper) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
const fieldStyle = (state, disabled) => ({
  width: '100%',
  height: 40,
  padding: '0 var(--space-3)',
  background: disabled ? 'var(--surface-base)' : 'var(--surface-sunken)',
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  border: '1px solid ' + state,
  borderRadius: 'var(--radius-md)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-body-size)',
  lineHeight: 'var(--text-body-lh)',
  textAlign: 'start',
  outline: 'none',
  transition: 'border-color var(--duration-fast) var(--ease-in-out)'
});

/** Listbox select. Keyboard contract: Space/Enter/ArrowDown opens, arrows move, type-ahead jumps, Escape closes, focus returns. */
function Select({
  label,
  id,
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  helper,
  error,
  disabled = false,
  style
}) {
  const auto = React.useId();
  const fieldId = id || auto;
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const [hover, setHover] = React.useState(false);
  const triggerRef = React.useRef(null);
  const typed = React.useRef({
    str: '',
    at: 0
  });
  const selected = options.find(o => o.value === value);
  const border = error ? 'var(--color-danger)' : open ? 'var(--border-accent)' : hover ? 'var(--border-strong)' : 'var(--border-default)';
  const close = refocus => {
    setOpen(false);
    if (refocus && triggerRef.current) triggerRef.current.focus();
  };
  const pick = i => {
    const o = options[i];
    if (!o) return;
    if (onChange) onChange(o.value);
    close(true);
  };
  React.useEffect(() => {
    if (!open) return undefined;
    const away = e => {
      if (triggerRef.current && !triggerRef.current.parentNode.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  const onKeyDown = e => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(highlight);
    } else if (e.key.length === 1) {
      const now = Date.now();
      typed.current.str = now - typed.current.at < 600 ? typed.current.str + e.key : e.key;
      typed.current.at = now;
      const i = options.findIndex(o => o.label.toLowerCase().startsWith(typed.current.str.toLowerCase()));
      if (i >= 0) setHighlight(i);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--text-sm-size)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    ref: triggerRef,
    id: fieldId,
    type: "button",
    disabled: disabled,
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    "aria-invalid": error ? 'true' : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: () => setOpen(o => !o),
    onKeyDown: onKeyDown,
    style: {
      ...fieldStyle(border, disabled),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: selected ? 'var(--text-primary)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, selected ? selected.label : placeholder), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16,
    color: "var(--text-secondary)"
  })), open ? /*#__PURE__*/React.createElement("ul", {
    role: "listbox",
    "aria-labelledby": fieldId,
    tabIndex: -1,
    style: {
      position: 'absolute',
      insetInlineStart: 0,
      insetBlockStart: 'calc(100% + var(--space-1))',
      width: '100%',
      margin: 0,
      padding: 'var(--space-1)',
      listStyle: 'none',
      background: 'var(--surface-overlay)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      zIndex: 'var(--z-dropdown)',
      maxHeight: 220,
      overflowY: 'auto'
    }
  }, options.map((o, i) => /*#__PURE__*/React.createElement("li", {
    key: o.value,
    role: "option",
    "aria-selected": o.value === value,
    onMouseEnter: () => setHighlight(i),
    onClick: () => pick(i),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-2) var(--space-3)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--text-body-size)',
      cursor: 'pointer',
      background: o.value === value ? 'var(--color-accent-subtle)' : i === highlight ? 'var(--surface-raised)' : 'transparent',
      color: o.value === value ? 'var(--color-accent-text)' : 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, o.label), o.value === value ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16
  }) : null))) : null), error || helper ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)',
      color: error ? 'var(--color-danger-text)' : 'var(--text-secondary)'
    }
  }, error || helper) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const fieldStyle = (state, disabled) => ({
  width: '100%',
  height: 40,
  padding: '0 var(--space-3)',
  background: disabled ? 'var(--surface-base)' : 'var(--surface-sunken)',
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  border: '1px solid ' + state,
  borderRadius: 'var(--radius-md)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-body-size)',
  lineHeight: 'var(--text-body-lh)',
  textAlign: 'start',
  outline: 'none',
  transition: 'border-color var(--duration-fast) var(--ease-in-out)'
});

/** Multi-line field. Vertical resize only — horizontal resize breaks the column layout. */
function Textarea({
  label,
  id,
  value = '',
  onChange,
  placeholder,
  helper,
  error,
  maxLength,
  disabled = false,
  rows = 4,
  style,
  ...rest
}) {
  const auto = React.useId();
  const fieldId = id || auto;
  const [hover, setHover] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const border = error ? 'var(--color-danger)' : focus ? 'var(--border-accent)' : hover ? 'var(--border-strong)' : 'var(--border-default)';
  const showCount = maxLength ? value.length >= maxLength * 0.8 : false;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--text-sm-size)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: fieldId,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    rows: rows,
    maxLength: maxLength,
    disabled: disabled,
    "aria-invalid": error ? 'true' : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...fieldStyle(border, disabled),
      height: 'auto',
      minHeight: 96,
      padding: 'var(--space-3)',
      resize: 'vertical'
    }
  }, rest)), error || helper || showCount ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm-size)',
      color: error ? 'var(--color-danger-text)' : 'var(--text-secondary)'
    }
  }, error || helper), showCount ? /*#__PURE__*/React.createElement("span", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-xs-size)',
      color: 'var(--text-secondary)'
    }
  }, value.length, " / ", maxLength) : null) : null);
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/identity/ClubCrest.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 24,
  md: 40,
  lg: 64
};

/** Crest container. Mandatory light plate — most crests are authored on white with dark linework. */
function ClubCrest({
  src,
  name = '',
  size = 'md',
  style,
  ...rest
}) {
  const box = SIZES[size] || SIZES.md;
  const fallback = String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    title: name,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
      width: box,
      height: box,
      padding: 2,
      background: src ? 'var(--surface-image-plate)' : 'var(--surface-sunken)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      fontSize: Math.max(10, Math.round(box * 0.3)),
      fontWeight: 'var(--weight-semibold)',
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    }
  }) : fallback);
}
Object.assign(__ds_scope, { ClubCrest });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/ClubCrest.jsx", error: String((e && e.message) || e) }); }

// components/identity/PositionChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Football position code. Always Latin, always dir="ltr" so Arabic layouts do not reorder it. */
function PositionChip({
  code,
  variant = 'secondary',
  style,
  ...rest
}) {
  const primary = variant === 'primary';
  return /*#__PURE__*/React.createElement("span", _extends({
    dir: "ltr",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 28,
      height: 28,
      padding: '0 var(--space-2)',
      borderRadius: 'var(--radius-sm)',
      background: primary ? 'var(--color-accent-subtle)' : 'var(--surface-sunken)',
      color: primary ? 'var(--color-accent-text)' : 'var(--text-primary)',
      fontFamily: 'var(--font-numeric)',
      fontVariantNumeric: 'tabular-nums',
      fontSize: 'var(--text-xs-size)',
      fontWeight: 'var(--weight-medium)',
      unicodeBidi: 'isolate',
      ...style
    }
  }, rest), code);
}
Object.assign(__ds_scope, { PositionChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/PositionChip.jsx", error: String((e && e.message) || e) }); }

// components/identity/roleConfig.js
try { (() => {
/** Single source of truth for the six professional roles. Colours live in tokens/roles.css. */
const ROLE_CONFIG = {
  PLAYER: {
    icon: 'shirt',
    labelEn: 'Player',
    labelAr: 'لاعب'
  },
  COACH: {
    icon: 'clipboard-list',
    labelEn: 'Coach',
    labelAr: 'مدرب'
  },
  SCOUT: {
    icon: 'binoculars',
    labelEn: 'Scout',
    labelAr: 'كشاف'
  },
  ANALYST: {
    icon: 'chart-line',
    labelEn: 'Analyst',
    labelAr: 'محلل أداء'
  },
  PHYSIO: {
    icon: 'heart-pulse',
    labelEn: 'Physio',
    labelAr: 'أخصائي علاج طبيعي'
  },
  CLUB: {
    icon: 'shield',
    labelEn: 'Club',
    labelAr: 'نادي'
  }
};
Object.assign(__ds_scope, { ROLE_CONFIG });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/roleConfig.js", error: String((e && e.message) || e) }); }

// components/identity/RoleBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The ONLY component permitted to use role colours. Colour arrives via data-role, from CSS. */
function RoleBadge({
  role,
  variant = 'full',
  lang = 'en',
  style,
  ...rest
}) {
  const cfg = __ds_scope.ROLE_CONFIG[role] || __ds_scope.ROLE_CONFIG.PLAYER;
  const label = lang === 'ar' ? cfg.labelAr : cfg.labelEn;
  const compact = variant === 'compact';
  return /*#__PURE__*/React.createElement("span", _extends({
    "data-role": role,
    "aria-label": compact ? label : undefined,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 0 : 'var(--space-1)',
      width: compact ? 24 : undefined,
      height: compact ? 24 : undefined,
      padding: compact ? 0 : '4px 10px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--role-bg)',
      color: 'var(--role-text)',
      border: '1px solid var(--role-border)',
      fontSize: 'var(--text-xs-size)',
      lineHeight: 'var(--text-xs-lh)',
      fontWeight: 'var(--weight-medium)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: cfg.icon,
    size: 14
  }), compact ? null : label);
}
Object.assign(__ds_scope, { RoleBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/RoleBadge.jsx", error: String((e && e.message) || e) }); }

// components/identity/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: {
    box: 24,
    font: 10
  },
  sm: {
    box: 32,
    font: 12
  },
  md: {
    box: 40,
    font: 14
  },
  lg: {
    box: 56,
    font: 18
  },
  xl: {
    box: 120,
    font: 40
  }
};
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  const first = parts[0] ? parts[0][0] : '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** User image on a light plate, so transparent PNGs never disappear into the dark surface. */
function Avatar({
  src,
  name = '',
  size = 'md',
  role,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const showRole = role && (size === 'lg' || size === 'xl');
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-block',
      flex: '0 0 auto',
      width: s.box,
      height: s.box,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--border-default)',
      background: src ? 'var(--surface-image-plate)' : 'var(--surface-sunken)',
      color: 'var(--text-secondary)',
      fontSize: s.font,
      fontWeight: 'var(--weight-medium)',
      fontFamily: 'var(--font-latin)',
      letterSpacing: '0.02em'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials(name)), showRole ? /*#__PURE__*/React.createElement(__ds_scope.RoleBadge, {
    role: role,
    variant: "compact",
    style: {
      position: 'absolute',
      insetBlockEnd: 0,
      insetInlineEnd: 0,
      width: Math.round(s.box * 0.4),
      height: Math.round(s.box * 0.4),
      boxShadow: '0 0 0 2px var(--surface-raised)'
    }
  }) : null);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/content/PostCard.jsx
try { (() => {
function relative(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 60) return Math.max(1, mins) + 'm ago';
  if (mins < 1440) return Math.round(mins / 60) + 'h ago';
  const days = Math.round(mins / 1440);
  if (days < 7) return days + 'd ago';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
function ImageGrid({
  images
}) {
  const shown = images.slice(0, 4);
  const extra = images.length - 4;
  const plate = {
    background: 'var(--surface-image-plate)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    position: 'relative'
  };
  const img = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover'
  };
  if (shown.length === 1) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...plate,
        aspectRatio: '16 / 9'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: shown[0],
      alt: "",
      loading: "lazy",
      style: {
        ...img,
        objectFit: 'contain'
      }
    }));
  }
  const cols = shown.length === 3 ? '2fr 1fr' : '1fr 1fr';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 4
    }
  }, shown.map((src, i) => /*#__PURE__*/React.createElement("div", {
    key: src + i,
    style: {
      ...plate,
      aspectRatio: shown.length === 3 && i === 0 ? '1 / 2.06' : '1 / 1',
      gridRow: shown.length === 3 && i === 0 ? 'span 2' : undefined
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    loading: "lazy",
    style: img
  }), i === 3 && extra > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      color: '#FFFFFF',
      fontSize: 'var(--text-h3-size)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "+", extra) : null)));
}

/** The most-viewed component in the product. Text and images only. */
function PostCard({
  author,
  body,
  images = [],
  timestamp,
  likes = 0,
  comments = 0,
  liked = false,
  saved = false,
  onLike,
  onComment,
  onSave,
  onMore,
  style
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [optimistic, setOptimistic] = React.useState({
    liked,
    likes
  });
  React.useEffect(() => setOptimistic({
    liked,
    likes
  }), [liked, likes]);
  const like = () => {
    setOptimistic(o => ({
      liked: !o.liked,
      likes: o.likes + (o.liked ? -1 : 1)
    }));
    if (onLike) onLike();
  };
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-4)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: author.avatar,
    name: author.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, author.name), author.role ? /*#__PURE__*/React.createElement(__ds_scope.RoleBadge, {
    role: author.role
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)',
      lineHeight: 'var(--text-sm-lh)',
      color: 'var(--text-secondary)'
    }
  }, author.subtitle), /*#__PURE__*/React.createElement("time", {
    dateTime: timestamp,
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-muted)'
    }
  }, relative(timestamp))), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "ellipsis",
    label: "Post options",
    size: "sm",
    onClick: onMore
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-lg-size)',
      lineHeight: 'var(--text-body-lg-lh)',
      textWrap: 'pretty',
      whiteSpace: 'pre-wrap',
      display: expanded ? 'block' : '-webkit-box',
      WebkitLineClamp: expanded ? 'none' : 4,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, body), !expanded && body.length > 220 ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setExpanded(true),
    style: {
      justifySelf: 'start',
      padding: 0,
      background: 'none',
      border: 'none',
      color: 'var(--color-accent-text)',
      font: 'inherit',
      fontSize: 'var(--text-sm-size)',
      cursor: 'pointer'
    }
  }, "Show more") : null, images.length ? /*#__PURE__*/React.createElement(ImageGrid, {
    images: images
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '0 calc(var(--space-5) * -1)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Action, {
    icon: "heart",
    active: optimistic.liked,
    label: optimistic.liked ? 'Unlike post' : 'Like post',
    count: optimistic.likes,
    onClick: like
  }), /*#__PURE__*/React.createElement(Action, {
    icon: "message-circle",
    label: "Comment",
    count: comments,
    onClick: onComment
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bookmark",
    label: "Save post",
    size: "sm",
    active: saved,
    onClick: onSave,
    style: {
      marginInlineStart: 'auto'
    }
  })));
}
function Action({
  icon,
  label,
  count,
  active,
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: icon,
    label: label,
    size: "sm",
    active: active,
    onClick: onClick
  }), /*#__PURE__*/React.createElement("span", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-sm-size)',
      fontVariantNumeric: 'tabular-nums',
      color: active ? 'var(--color-accent-text)' : 'var(--text-secondary)'
    }
  }, count));
}
Object.assign(__ds_scope, { PostCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/PostCard.jsx", error: String((e && e.message) || e) }); }

// components/content/ProfileHeader.jsx
try { (() => {
/** The identity surface — and the only place the pitch line appears. */
function ProfileHeader({
  name,
  role,
  avatar,
  positions = [],
  club,
  location,
  followers,
  age,
  primaryAction,
  secondaryAction,
  style
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-5)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-6)',
      alignItems: 'flex-start',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: avatar,
    name: name,
    size: "xl",
    role: role
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220,
      display: 'grid',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h1-size)',
      lineHeight: 'var(--text-h1-lh)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      marginInlineStart: 'auto'
    }
  }, secondaryAction, primaryAction)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RoleBadge, {
    role: role
  }), positions.map((p, i) => /*#__PURE__*/React.createElement(__ds_scope.PositionChip, {
    key: p,
    code: p,
    variant: i === 0 ? 'primary' : 'secondary'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-size)',
      color: 'var(--text-secondary)'
    }
  }, [club, location, age ? 'Age ' + age : null].filter(Boolean).join(' · ')), /*#__PURE__*/React.createElement("div", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, Number(followers || 0).toLocaleString('en-GB'), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      fontWeight: 400
    }
  }, "followers")))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--pitch-line)',
      margin: '0 calc(var(--space-5) * -1) calc(var(--space-5) * -1)'
    }
  }));
}
Object.assign(__ds_scope, { ProfileHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ProfileHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomTabBar.jsx
try { (() => {
/** Mobile navigation: 56px, five items maximum, safe-area aware. */
function BottomTabBar({
  items = [],
  active,
  onNavigate,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      insetBlockEnd: 0,
      zIndex: 'var(--z-nav)',
      display: 'flex',
      height: 'var(--layout-tabbar-height)',
      paddingBlockEnd: 'env(safe-area-inset-bottom)',
      background: 'var(--surface-raised)',
      borderBlockStart: '1px solid var(--border-default)',
      ...style
    }
  }, items.slice(0, 5).map(it => {
    const on = it.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      type: "button",
      onClick: () => onNavigate && onNavigate(it.value),
      "aria-current": on ? 'page' : undefined,
      style: {
        flex: 1,
        minHeight: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: 'none',
        border: 'none',
        font: 'inherit',
        fontSize: 'var(--text-xs-size)',
        cursor: 'pointer',
        color: on ? 'var(--color-accent-text)' : 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 20
    }), it.label);
  }));
}
Object.assign(__ds_scope, { BottomTabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomTabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/LeftRail.jsx
try { (() => {
/** 240px sticky rail: profile summary, nav links, club shortcuts. */
function LeftRail({
  user,
  links = [],
  active,
  onNavigate,
  clubs = [],
  style
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'sticky',
      insetBlockStart: 88,
      alignSelf: 'start',
      width: 'var(--layout-rail-start)',
      display: 'grid',
      gap: 'var(--space-4)',
      ...style
    }
  }, user ? /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: "var(--space-4)",
    style: {
      display: 'grid',
      gap: 'var(--space-3)',
      justifyItems: 'center',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: user.avatar,
    name: user.name,
    size: "lg",
    role: user.role
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, user.subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-6)',
      width: '100%',
      justifyContent: 'center',
      paddingBlockStart: 'var(--space-3)',
      borderBlockStart: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Followers",
    value: user.followers
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Views",
    value: user.views
  }))) : null, /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: "var(--space-2)",
    style: {
      display: 'grid',
      gap: 2
    }
  }, links.map(l => {
    const on = l.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: l.value,
      type: "button",
      onClick: () => onNavigate && onNavigate(l.value),
      "aria-current": on ? 'page' : undefined,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        minHeight: 36,
        borderRadius: 'var(--radius-md)',
        border: 'none',
        font: 'inherit',
        fontSize: 'var(--text-body-size)',
        textAlign: 'start',
        cursor: 'pointer',
        background: on ? 'var(--color-accent-subtle)' : 'transparent',
        color: on ? 'var(--color-accent-text)' : 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: l.icon,
      size: 18
    }), l.label);
  })), clubs.length ? /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: "var(--space-4)",
    style: {
      display: 'grid',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs-size)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)'
    }
  }, "My clubs"), clubs.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ClubCrest, {
    name: c.name,
    src: c.crest,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm-size)'
    }
  }, c.name)))) : null);
}
function Stat({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, Number(value || 0).toLocaleString('en-GB')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs-size)',
      color: 'var(--text-muted)'
    }
  }, label));
}
Object.assign(__ds_scope, { LeftRail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/LeftRail.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Roving-tabindex tablist with a 2px accent underline on the active tab. */
function Tabs({
  tabs = [],
  value,
  onChange,
  style
}) {
  const refs = React.useRef([]);
  const index = Math.max(0, tabs.findIndex(t => t.value === value));
  const move = next => {
    const t = tabs[next];
    if (!t) return;
    if (onChange) onChange(t.value);
    const el = refs.current[next];
    if (el) el.focus();
  };
  const onKeyDown = e => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move((index - 1 + tabs.length) % tabs.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(tabs.length - 1);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    onKeyDown: onKeyDown,
    style: {
      display: 'flex',
      gap: 'var(--space-6)',
      borderBlockEnd: '1px solid var(--border-default)',
      ...style
    }
  }, tabs.map((t, i) => {
    const active = i === index;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      ref: el => {
        refs.current[i] = el;
      },
      role: "tab",
      type: "button",
      "aria-selected": active,
      "aria-controls": t.controls,
      tabIndex: active ? 0 : -1,
      onClick: () => onChange && onChange(t.value),
      style: {
        padding: 'var(--space-3) 0',
        background: 'none',
        border: 'none',
        borderBlockEnd: '2px solid ' + (active ? 'var(--color-accent)' : 'transparent'),
        marginBlockEnd: -1,
        font: 'inherit',
        fontSize: 'var(--text-body-size)',
        fontWeight: active ? 'var(--weight-medium)' : 'var(--weight-regular)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'color var(--duration-fast) var(--ease-in-out)'
      }
    }, t.label, typeof t.count === 'number' ? /*#__PURE__*/React.createElement("span", {
      className: "t-num",
      style: {
        color: 'var(--text-muted)',
        marginInlineStart: 6
      }
    }, t.count) : null);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
/** 64px sticky application bar. */
function TopNav({
  items = [],
  active,
  onNavigate,
  onSearch,
  searchValue = '',
  user,
  notifications = 0,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      insetBlockStart: 0,
      zIndex: 'var(--z-nav)',
      height: 'var(--layout-nav-height)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      padding: '0 var(--space-6)',
      background: 'var(--surface-raised)',
      borderBlockEnd: '1px solid var(--border-default)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-h3-size)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: '-0.01em'
    }
  }, "Taktika", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-accent-text)'
    }
  }, ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: 320,
      maxWidth: '32vw'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16,
    color: "var(--text-muted)",
    style: {
      position: 'absolute',
      insetInlineStart: 'var(--space-3)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: searchValue,
    onChange: e => onSearch && onSearch(e.target.value),
    placeholder: "Search players, coaches, clubs",
    "aria-label": "Search Taktika",
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      height: 36,
      paddingInlineStart: 'var(--space-8)',
      paddingInlineEnd: 'var(--space-3)',
      background: 'var(--surface-sunken)',
      color: 'var(--text-primary)',
      border: '1px solid ' + (focus ? 'var(--border-accent)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-md)',
      font: 'inherit',
      fontSize: 'var(--text-sm-size)',
      outline: 'none',
      textAlign: 'start'
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginInlineStart: 'auto'
    }
  }, items.map(it => {
    const on = it.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      type: "button",
      onClick: () => onNavigate && onNavigate(it.value),
      "aria-current": on ? 'page' : undefined,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: 'var(--space-2) var(--space-3)',
        minWidth: 72,
        background: 'none',
        border: 'none',
        font: 'inherit',
        fontSize: 'var(--text-xs-size)',
        cursor: 'pointer',
        position: 'relative',
        color: on ? 'var(--color-accent-text)' : 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 20
    }), it.value === 'notifications' && notifications > 0 ? /*#__PURE__*/React.createElement("span", {
      "aria-label": notifications + ' unread',
      style: {
        position: 'absolute',
        insetBlockStart: -2,
        insetInlineEnd: -2,
        width: 8,
        height: 8,
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-danger)'
      }
    }) : null), it.label, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        insetBlockEnd: -12,
        insetInline: 0,
        height: 2,
        background: on ? 'var(--color-accent)' : 'transparent'
      }
    }));
  }), user ? /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: user.name,
    src: user.avatar,
    size: "sm",
    style: {
      marginInlineStart: 'var(--space-3)'
    }
  }) : null));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/App.jsx
try { (() => {
const {
  LeftRail,
  ToastStack,
  Modal,
  Button
} = window.TaktikaDesignSystem_be64d5;
function App() {
  const D = window.TK_DATA;
  const [view, setView] = React.useState('feed');
  const [search, setSearch] = React.useState('');
  const [posts, setPosts] = React.useState(D.posts);
  const [threads, setThreads] = React.useState(D.threads);
  const [activeThread, setActiveThread] = React.useState('t1');
  const [person, setPerson] = React.useState(null);
  const [toasts, setToasts] = React.useState([]);
  const [confirm, setConfirm] = React.useState(false);
  const toast = t => {
    const id = Date.now();
    setToasts(all => [...all, {
      id,
      ...t
    }]);
    if (t.variant !== 'danger') setTimeout(() => setToasts(all => all.filter(x => x.id !== id)), 4000);
  };
  const addPost = body => {
    setPosts(all => [{
      id: Date.now(),
      author: {
        name: D.me.name,
        subtitle: D.me.subtitle,
        role: D.me.role
      },
      body,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0
    }, ...all]);
    toast({
      variant: 'success',
      title: 'Post published',
      description: 'Your network can see it now.'
    });
  };
  const like = id => setPosts(all => all.map(p => p.id === id ? {
    ...p,
    liked: !p.liked,
    likes: p.likes + (p.liked ? -1 : 1)
  } : p));
  const send = (threadId, text) => {
    setThreads(all => all.map(t => t.id === threadId ? {
      ...t,
      preview: text,
      time: 'now',
      messages: [...t.messages, {
        from: 'me',
        text,
        time: 'now'
      }]
    } : t));
  };
  const openProfile = p => {
    setPerson(p);
    setView('profile');
  };
  const go = v => {
    setPerson(null);
    setView(v);
  };
  return /*#__PURE__*/React.createElement(AppShell, {
    view: view,
    setView: go,
    search: search,
    setSearch: setSearch
  }, view === 'feed' ? /*#__PURE__*/React.createElement(ThreeColumn, {
    left: /*#__PURE__*/React.createElement(LeftRail, {
      style: {
        width: '100%'
      },
      user: D.me,
      links: D.rail,
      active: "feed",
      clubs: D.clubs,
      onNavigate: () => {}
    }),
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WhoToFollow, {
      onOpenProfile: openProfile
    }), /*#__PURE__*/React.createElement(TrendingClubs, null))
  }, /*#__PURE__*/React.createElement(Feed, {
    posts: posts,
    onPost: addPost,
    onLike: like
  })) : null, view === 'network' || view === 'search' ? /*#__PURE__*/React.createElement(Search, {
    query: search,
    onOpenProfile: openProfile
  }) : null, view === 'profile' || view === 'me' ? /*#__PURE__*/React.createElement(Profile, {
    person: person,
    posts: posts,
    onLike: like,
    onMessage: () => {
      setView('messages');
      toast({
        variant: 'info',
        title: 'Conversation opened'
      });
    }
  }) : null, view === 'messages' ? /*#__PURE__*/React.createElement(Messages, {
    threads: threads,
    activeId: activeThread,
    onSelect: setActiveThread,
    onSend: send
  }) : null, view === 'notifications' ? /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      margin: '0 auto',
      display: 'grid',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => setConfirm(true)
  }, "Clear all notifications"), [['Tarek Fouad started following you', '2h'], ['Mariam Saleh liked your post', '5h'], ['Al Ahly Academy confirmed your trial', '1d']].map(([t, when]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4) var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--text-body-size)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-muted)'
    }
  }, when)))) : null, /*#__PURE__*/React.createElement(Modal, {
    open: confirm,
    onClose: () => setConfirm(false),
    title: "Clear all notifications",
    description: "This dismisses every notification in the list. It cannot be undone.",
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setConfirm(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      onClick: () => {
        setConfirm(false);
        toast({
          variant: 'success',
          title: 'Notifications cleared'
        });
      }
    }, "Clear all"))
  }), /*#__PURE__*/React.createElement(ToastStack, {
    toasts: toasts,
    onDismiss: id => setToasts(all => all.filter(t => t.id !== id))
  }));
}
const tkRoot = typeof document !== 'undefined' ? document.getElementById('root') : null;
if (tkRoot) ReactDOM.createRoot(tkRoot).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Feed.jsx
try { (() => {
const {
  Card,
  Button,
  IconButton,
  Avatar,
  RoleBadge,
  PostCard,
  Textarea,
  ClubCrest,
  Icon,
  SkeletonPost
} = window.TaktikaDesignSystem_be64d5;
function Composer({
  onPost
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const D = window.TK_DATA;
  if (!open) {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: D.me.name,
      size: "md"
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setOpen(true),
      style: {
        flex: 1,
        height: 40,
        paddingInline: 'var(--space-4)',
        textAlign: 'start',
        background: 'var(--surface-sunken)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-full)',
        font: 'inherit',
        fontSize: 'var(--text-body-size)',
        cursor: 'pointer'
      }
    }, "Share an update with your network"), /*#__PURE__*/React.createElement(IconButton, {
      icon: "image",
      label: "Add photo",
      onClick: () => setOpen(true)
    }));
  }
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: D.me.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, D.me.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, D.me.subtitle))), /*#__PURE__*/React.createElement(Textarea, {
    label: "Post",
    value: text,
    maxLength: 600,
    rows: 4,
    placeholder: "Match report, trial news, a question for the network\u2026",
    onChange: e => setText(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "image",
    label: "Add photo"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "link",
    label: "Add link"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginInlineStart: 'auto',
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => {
      setOpen(false);
      setText('');
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => {
      if (text.trim()) onPost(text.trim());
      setText('');
      setOpen(false);
    }
  }, "Post"))));
}
function WhoToFollow({
  onOpenProfile
}) {
  const D = window.TK_DATA;
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs-size)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)'
    }
  }, "Who to follow"), D.people.slice(0, 3).map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onOpenProfile(p),
    style: {
      padding: 0,
      background: 'none',
      border: 'none',
      font: 'inherit',
      fontSize: 'var(--text-sm-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      textAlign: 'start'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs-size)',
      color: 'var(--text-secondary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, p.subtitle)), /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "Follow"))));
}
function TrendingClubs() {
  const rows = [['Al Ahly', '2,410 members'], ['Zamalek SC', '1,980 members'], ['Pyramids FC', '1,120 members']];
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs-size)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)'
    }
  }, "Trending clubs"), rows.map(([name, meta]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(ClubCrest, {
    name: name,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-xs-size)',
      color: 'var(--text-muted)'
    }
  }, meta)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--text-muted)"
  }))));
}
function Feed({
  posts,
  onPost,
  onLike,
  loading
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Composer, {
    onPost: onPost
  }), loading ? /*#__PURE__*/React.createElement(SkeletonPost, null) : null, posts.map(p => /*#__PURE__*/React.createElement(PostCard, {
    key: p.id,
    author: p.author,
    body: p.body,
    timestamp: p.timestamp,
    likes: p.likes,
    comments: p.comments,
    liked: p.liked,
    onLike: () => onLike(p.id)
  })));
}
Object.assign(window, {
  Feed,
  Composer,
  WhoToFollow,
  TrendingClubs
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Feed.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Messages.jsx
try { (() => {
const {
  Card,
  Avatar,
  RoleBadge,
  IconButton,
  Icon,
  Button
} = window.TaktikaDesignSystem_be64d5;
function Messages({
  threads,
  activeId,
  onSelect,
  onSend
}) {
  const narrow = window.useBreakpoint() === 'mobile';
  const [draft, setDraft] = React.useState('');
  const thread = threads.find(t => t.id === activeId) || threads[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: narrow ? 'minmax(0,1fr)' : '320px minmax(0,1fr)',
      gap: 'var(--layout-column-gap)',
      maxWidth: 1080,
      margin: '0 auto',
      height: narrow ? 'auto' : 'calc(100vh - 64px - var(--space-12))'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-2)",
    style: {
      display: 'grid',
      gap: 2,
      alignContent: 'start',
      overflowY: 'auto'
    }
  }, threads.map(t => {
    const on = t.id === thread.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      onClick: () => onSelect(t.id),
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center',
        textAlign: 'start',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: on ? 'var(--color-accent-subtle)' : 'transparent',
        cursor: 'pointer',
        font: 'inherit'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: t.name,
      size: "md"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-2)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-body-size)',
        fontWeight: 'var(--weight-medium)',
        color: on ? 'var(--color-accent-text)' : 'var(--text-primary)'
      }
    }, t.name), /*#__PURE__*/React.createElement("span", {
      className: "t-num",
      style: {
        marginInlineStart: 'auto',
        fontSize: 'var(--text-xs-size)',
        color: 'var(--text-muted)'
      }
    }, t.time)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-sm-size)',
        color: 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, t.preview)));
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "0",
    style: {
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-4) var(--space-5)',
      borderBlockEnd: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: thread.name,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, thread.name), /*#__PURE__*/React.createElement(RoleBadge, {
    role: thread.role
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "ellipsis",
    label: "Conversation options",
    size: "sm",
    style: {
      marginInlineStart: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5)',
      display: 'grid',
      gap: 'var(--space-3)',
      alignContent: 'end',
      overflowY: 'auto'
    }
  }, thread.messages.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      justifySelf: m.from === 'me' ? 'end' : 'start',
      maxWidth: '70%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-lg)',
      background: m.from === 'me' ? 'var(--color-accent-subtle)' : 'var(--surface-sunken)',
      color: m.from === 'me' ? 'var(--color-accent-text)' : 'var(--text-primary)',
      fontSize: 'var(--text-body-size)',
      lineHeight: 'var(--text-body-lh)',
      textWrap: 'pretty'
    }
  }, m.text), /*#__PURE__*/React.createElement("div", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-xs-size)',
      color: 'var(--text-muted)',
      marginBlockStart: 4,
      textAlign: m.from === 'me' ? 'end' : 'start'
    }
  }, m.time)))), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      if (draft.trim()) {
        onSend(thread.id, draft.trim());
        setDraft('');
      }
    },
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      padding: 'var(--space-4) var(--space-5)',
      borderBlockStart: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    "aria-label": "Write a message",
    placeholder: "Write a message",
    style: {
      flex: 1,
      height: 40,
      padding: '0 var(--space-3)',
      background: 'var(--surface-sunken)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      font: 'inherit',
      fontSize: 'var(--text-body-size)',
      outline: 'none',
      textAlign: 'start'
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconStart: "send",
    onClick: e => {
      e.preventDefault();
      if (draft.trim()) {
        onSend(thread.id, draft.trim());
        setDraft('');
      }
    }
  }, "Send"))));
}
Object.assign(window, {
  Messages
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Messages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Profile.jsx
try { (() => {
const {
  Card,
  CardDivider,
  Button,
  Tabs,
  ProfileHeader,
  PostCard,
  Badge,
  ClubCrest,
  EmptyState,
  Icon
} = window.TaktikaDesignSystem_be64d5;
function CareerRow({
  item
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(ClubCrest, {
    name: item.club,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, item.club), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, item.role), /*#__PURE__*/React.createElement("div", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-muted)'
    }
  }, item.period, " \xB7 ", item.detail)));
}
function Profile({
  person,
  posts,
  onMessage,
  onLike
}) {
  const D = window.TK_DATA;
  const [tab, setTab] = React.useState('posts');
  const isMe = !person;
  const p = person || D.me;
  const mine = posts.filter(x => x.author.name === p.name);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-4)',
      maxWidth: 780,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(ProfileHeader, {
    name: p.name,
    role: p.role,
    positions: p.positions || [],
    club: (p.subtitle || '').split(' · ')[1],
    location: p.location,
    followers: p.followers || 640,
    age: p.age,
    primaryAction: isMe ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconStart: "pencil"
    }, "Edit profile") : /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconStart: "send",
      onClick: onMessage
    }, "Message"),
    secondaryAction: isMe ? null : /*#__PURE__*/React.createElement(Button, null, "Follow")
  }), /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'posts',
      label: 'Posts',
      count: mine.length
    }, {
      value: 'about',
      label: 'About'
    }, {
      value: 'career',
      label: 'Career'
    }]
  }), tab === 'posts' ? mine.length ? mine.map(x => /*#__PURE__*/React.createElement(PostCard, {
    key: x.id,
    author: x.author,
    body: x.body,
    timestamp: x.timestamp,
    likes: x.likes,
    comments: x.comments,
    liked: x.liked,
    onLike: () => onLike(x.id)
  })) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "file-text",
    title: "No posts yet",
    description: "Share an update to start building your profile.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "primary"
    }, "Create post")
  }) : null, tab === 'about' ? /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-lg-size)',
      lineHeight: 'var(--text-body-lg-lh)',
      textWrap: 'pretty'
    }
  }, "Striker in the Al Ahly first-team squad. Left-footed, comfortable dropping between the lines. Available for trials outside Egypt during the winter break."), /*#__PURE__*/React.createElement(CardDivider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "success",
    icon: "badge-check"
  }, "Verified by club"), /*#__PURE__*/React.createElement(Badge, null, "Open to trials"), /*#__PURE__*/React.createElement(Badge, {
    variant: "info"
  }, "Speaks Arabic, English"))) : null, tab === 'career' ? /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-5)'
    }
  }, D.career.map((c, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: c.club
  }, /*#__PURE__*/React.createElement(CareerRow, {
    item: c
  }), i < D.career.length - 1 ? /*#__PURE__*/React.createElement(CardDivider, {
    style: {
      margin: 0
    }
  }) : null))) : null);
}
Object.assign(window, {
  Profile
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Profile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Search.jsx
try { (() => {
const {
  Card,
  Button,
  Avatar,
  RoleBadge,
  Select,
  Icon,
  EmptyState
} = window.TaktikaDesignSystem_be64d5;
const ROLE_OPTIONS = [{
  value: 'ALL',
  label: 'All roles'
}, {
  value: 'PLAYER',
  label: 'Player'
}, {
  value: 'COACH',
  label: 'Coach'
}, {
  value: 'SCOUT',
  label: 'Scout'
}, {
  value: 'ANALYST',
  label: 'Performance Analyst'
}, {
  value: 'PHYSIO',
  label: 'Physiotherapist'
}, {
  value: 'CLUB',
  label: 'Club admin'
}];
function Search({
  query,
  onOpenProfile
}) {
  const D = window.TK_DATA;
  const narrow = window.useBreakpoint() === 'mobile';
  const [role, setRole] = React.useState('ALL');
  const [loc, setLoc] = React.useState('ALL');
  const q = (query || '').toLowerCase();
  const results = D.people.filter(p => (role === 'ALL' || p.role === role) && (loc === 'ALL' || p.location.startsWith(loc)) && (!q || p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: narrow ? 'minmax(0,1fr)' : '260px minmax(0,1fr)',
      gap: 'var(--layout-column-gap)',
      maxWidth: 1000,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'grid',
      gap: 'var(--space-4)',
      alignSelf: 'start',
      position: narrow ? 'static' : 'sticky',
      insetBlockStart: 88
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs-size)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)'
    }
  }, "Filters"), /*#__PURE__*/React.createElement(Select, {
    label: "Role",
    options: ROLE_OPTIONS,
    value: role,
    onChange: setRole
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Location",
    value: loc,
    onChange: setLoc,
    options: [{
      value: 'ALL',
      label: 'Anywhere'
    }, {
      value: 'Cairo',
      label: 'Cairo'
    }, {
      value: 'Giza',
      label: 'Giza'
    }, {
      value: 'Ismailia',
      label: 'Ismailia'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-4)',
      alignContent: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-num",
    style: {
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, results.length, " ", results.length === 1 ? 'result' : 'results', query ? ' for “' + query + '”' : ''), results.length ? results.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.name,
    interactive: true,
    onClick: () => onOpenProfile(p),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.name,
    size: "lg",
    role: p.role
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-h3-size)',
      fontWeight: 'var(--weight-medium)'
    }
  }, p.name), /*#__PURE__*/React.createElement(RoleBadge, {
    role: p.role
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-size)',
      color: 'var(--text-secondary)'
    }
  }, p.subtitle), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 'var(--text-sm-size)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 14
  }), p.location)), /*#__PURE__*/React.createElement(Button, null, "Follow"))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "search-x",
    title: "No profiles match",
    description: "Try a different role filter, or search by club name."
  })));
}
Object.assign(window, {
  Search
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Search.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Shell.jsx
try { (() => {
const {
  TopNav,
  BottomTabBar
} = window.TaktikaDesignSystem_be64d5;

/** Desktop-first breakpoints from the spec: wide ≥1280, desktop 1024–1279, tablet 768–1023, mobile <768. */
function useBreakpoint() {
  const get = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    if (w >= 1280) return 'wide';
    if (w >= 1024) return 'desktop';
    if (w >= 768) return 'tablet';
    return 'mobile';
  };
  const [bp, setBp] = React.useState(get);
  React.useEffect(() => {
    const on = () => setBp(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return bp;
}
function AppShell({
  view,
  setView,
  search,
  setSearch,
  children
}) {
  const D = window.TK_DATA;
  const bp = useBreakpoint();
  const mobile = bp === 'mobile';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--surface-base)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    items: mobile ? [] : D.nav,
    active: view,
    onNavigate: setView,
    user: D.me,
    notifications: 3,
    searchValue: search,
    onSearch: v => {
      setSearch(v);
      if (v) setView('search');
    }
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      width: '100%',
      maxWidth: 'var(--layout-container)',
      margin: '0 auto',
      padding: mobile ? 'var(--space-4)' : 'var(--space-6)'
    }
  }, children), mobile ? /*#__PURE__*/React.createElement(BottomTabBar, {
    items: [...D.nav.slice(0, 4), {
      value: 'me',
      label: 'Profile',
      icon: 'user'
    }],
    active: view,
    onNavigate: setView
  }) : null);
}

/** Three columns at wide/desktop, right rail dropped at tablet, single column on mobile. */
function ThreeColumn({
  left,
  children,
  right
}) {
  const bp = useBreakpoint();
  const columns = {
    wide: 'var(--layout-rail-start) minmax(0, 640px) var(--layout-rail-end)',
    desktop: 'var(--layout-rail-start) minmax(0, 1fr)',
    tablet: '200px minmax(0, 1fr)',
    mobile: 'minmax(0, 1fr)'
  }[bp];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: columns,
      gap: 'var(--layout-column-gap)',
      justifyContent: 'center',
      alignItems: 'start',
      width: '100%'
    }
  }, bp === 'mobile' ? null : /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, left), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-4)',
      minWidth: 0,
      maxWidth: 640,
      width: '100%',
      justifySelf: 'center'
    }
  }, children), bp === 'wide' ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      insetBlockStart: 88,
      display: 'grid',
      gap: 'var(--space-4)',
      minWidth: 0
    }
  }, right) : null);
}
Object.assign(window, {
  AppShell,
  ThreeColumn,
  useBreakpoint
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/data.js
try { (() => {
window.TK_DATA = {
  me: {
    name: 'Ahmed Hassan',
    subtitle: 'Striker · Al Ahly',
    role: 'PLAYER',
    followers: 1240,
    views: 318,
    positions: ['ST', 'CB'],
    location: 'Cairo, Egypt',
    age: 19
  },
  nav: [{
    value: 'feed',
    label: 'Feed',
    icon: 'house'
  }, {
    value: 'network',
    label: 'Network',
    icon: 'users'
  }, {
    value: 'messages',
    label: 'Messages',
    icon: 'send'
  }, {
    value: 'notifications',
    label: 'Alerts',
    icon: 'bell'
  }],
  rail: [{
    value: 'feed',
    label: 'Feed',
    icon: 'house'
  }, {
    value: 'saved',
    label: 'Saved posts',
    icon: 'bookmark'
  }, {
    value: 'career',
    label: 'Career history',
    icon: 'briefcase'
  }, {
    value: 'trials',
    label: 'Open trials',
    icon: 'calendar'
  }],
  clubs: [{
    name: 'Al Ahly'
  }, {
    name: 'Wadi Degla'
  }],
  posts: [{
    id: 1,
    author: {
      name: 'Mariam Saleh',
      subtitle: 'Performance Analyst · Pyramids FC',
      role: 'ANALYST'
    },
    body: 'Pressing data from the derby: 34 high regains, 11 of them in the final third. The shape held for 70 minutes before the drop-off, and the drop-off is a conditioning question, not a tactical one.\n\nFull breakdown in the club report on Monday.',
    timestamp: new Date(Date.now() - 7.2e6).toISOString(),
    likes: 84,
    comments: 12
  }, {
    id: 2,
    author: {
      name: 'Tarek Fouad',
      subtitle: 'Head Scout · Zamalek SC',
      role: 'SCOUT'
    },
    body: 'Watching the U19 league this month. If you are a centre-back born 2007 or later with senior minutes, send me your profile — I read every message.',
    timestamp: new Date(Date.now() - 2.6e7).toISOString(),
    likes: 212,
    comments: 47
  }, {
    id: 3,
    author: {
      name: 'Dr. Nour Adel',
      subtitle: 'Physiotherapist · Egyptian FA',
      role: 'PHYSIO'
    },
    body: 'Return-to-play after a grade 2 hamstring strain is a criteria decision, not a calendar decision. Six weeks means nothing if the eccentric strength deficit is still above 10%.',
    timestamp: new Date(Date.now() - 9.4e7).toISOString(),
    likes: 156,
    comments: 23
  }],
  people: [{
    name: 'Tarek Fouad',
    subtitle: 'Head Scout · Zamalek SC',
    role: 'SCOUT',
    location: 'Giza, Egypt'
  }, {
    name: 'Hossam El-Din',
    subtitle: 'Assistant Coach · Ismaily SC',
    role: 'COACH',
    location: 'Ismailia, Egypt'
  }, {
    name: 'Mariam Saleh',
    subtitle: 'Performance Analyst · Pyramids FC',
    role: 'ANALYST',
    location: 'Cairo, Egypt'
  }, {
    name: 'Dr. Nour Adel',
    subtitle: 'Physiotherapist · Egyptian FA',
    role: 'PHYSIO',
    location: 'Cairo, Egypt'
  }, {
    name: 'Al Ahly Academy',
    subtitle: 'Club · Youth recruitment',
    role: 'CLUB',
    location: 'Cairo, Egypt'
  }, {
    name: 'Youssef Karim',
    subtitle: 'Goalkeeper · Wadi Degla',
    role: 'PLAYER',
    location: 'Cairo, Egypt'
  }],
  threads: [{
    id: 't1',
    name: 'Tarek Fouad',
    role: 'SCOUT',
    preview: 'Send me the match footage when you can.',
    time: '2h',
    messages: [{
      from: 'them',
      text: 'Saw your goal against Ismaily. Which foot do you prefer for the far-post run?',
      time: '09:12'
    }, {
      from: 'me',
      text: 'Right, but I train the left every session.',
      time: '09:20'
    }, {
      from: 'them',
      text: 'Send me the match footage when you can.',
      time: '09:21'
    }]
  }, {
    id: 't2',
    name: 'Mariam Saleh',
    role: 'ANALYST',
    preview: 'Your pressing numbers are up 12% this month.',
    time: '1d',
    messages: [{
      from: 'them',
      text: 'Your pressing numbers are up 12% this month.',
      time: 'Yesterday'
    }]
  }, {
    id: 't3',
    name: 'Al Ahly Academy',
    role: 'CLUB',
    preview: 'Trial confirmation for 3 September.',
    time: '3d',
    messages: [{
      from: 'them',
      text: 'Trial confirmation for 3 September, 07:00 at the training ground.',
      time: 'Mon'
    }]
  }],
  career: [{
    club: 'Al Ahly',
    role: 'Striker · First team',
    period: '2024 — present',
    detail: '18 appearances · 7 goals'
  }, {
    club: 'Al Ahly U19',
    role: 'Striker',
    period: '2022 — 2024',
    detail: '41 appearances · 26 goals'
  }, {
    club: 'Wadi Degla Academy',
    role: 'Forward',
    period: '2019 — 2022',
    detail: 'Youth development'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.PostCard = __ds_scope.PostCard;

__ds_ns.ProfileHeader = __ds_scope.ProfileHeader;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardDivider = __ds_scope.CardDivider;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.SkeletonPost = __ds_scope.SkeletonPost;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.ToastStack = __ds_scope.ToastStack;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.ClubCrest = __ds_scope.ClubCrest;

__ds_ns.PositionChip = __ds_scope.PositionChip;

__ds_ns.RoleBadge = __ds_scope.RoleBadge;

__ds_ns.ROLE_CONFIG = __ds_scope.ROLE_CONFIG;

__ds_ns.BottomTabBar = __ds_scope.BottomTabBar;

__ds_ns.LeftRail = __ds_scope.LeftRail;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopNav = __ds_scope.TopNav;

})();
