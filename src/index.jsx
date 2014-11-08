/** @jsx React.DOM */

//     tcomb-form 0.1.6
//     https://github.com/gcanti/tcomb-form
//     (c) 2014 Giulio Canti <giulio.canti@gmail.com>
//     tcomb-form may be freely distributed under the MIT license.

'use strict';

var React = require('react');
var cx =    require('react/lib/cx');
var t =     require('tcomb-validation');

var assert =      t.assert;
var Any =         t.Any;
var Nil =         t.Nil;
var Str =         t.Str;
var Num =         t.Num;
var Bool =        t.Bool;
var Obj =         t.Obj;
var Arr =         t.Arr;
var Func =        t.Func;
var subtype =     t.subtype;
var maybe =       t.maybe;
var enums =       t.enums;
var list =        t.list;
var struct =      t.struct;
var tuple =       t.tuple;
var func =        t.func;
var mixin =       t.util.mixin;
var Type =        t.Type;
var getKind =     t.util.getKind;
var getName =     t.util.getName;
var Result =      t.validate.Result;

// represents the options order of a select input
// the `map` values  being used to actually sort the options
var Order = enums({
  asc: function (a, b) {
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  },
  desc: function (a, b) {
    return a.text < b.text ? 1 : a.text > b.text ? -1 : 0;
  }
}, 'Order');

// values localization
var I17n = struct({
  format: Func, // parse: (form input, type) -> coerced value for validation
  parse:  Func  // format: (value, type) -> formatted value displayed in the input component
}, 'I17n');

var defaultI17n = new I17n({
  parse: function (input, type) {
    return type === Num ?
      parseFloat(input) :
      input;
  },
  format: function (value) {
    return value;
  }
});

// labels internationalization
var I18n = struct({
  select: Str,    // automatic placeholder for selects
  optional: Str,  // automatic placeholder for optional values
  add: Str,       // button caption to add an element to a list
  remove: Str,    // button caption to remove an element from a list
  up: Str,        // button caption to move up an element of a list
  down: Str       // button caption to move down an element of a list
}, 'I18n');

var defaultI18n = new I18n({
  select:   'Select your ',
  optional: ' (optional)',
  add:      'Add',
  remove:   'Remove',
  up:       'Up',
  down:     'Down'
});

// represents an <option> tag
var Option = struct({
  value:  Str,
  text:   Str
}, 'Option');

//
// utils
//

// thanks to https://github.com/epeli/underscore.string
function underscored(s){
  return s.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
}

function capitalize(s){
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanize(s){
  return capitalize(underscored(s).replace(/_id$/,'').replace(/_/g, ' '));
}

var defaultOuterContainers = {maybe: 1, subtype: 1};

// returns the inner type stripping the `outerTypes`
// ex:
//     maybe(Str) -> Str
//     subtype(maybe(Num)) -> Num
function stripOuterType(type, outerTypes) {
  outerTypes = outerTypes || defaultOuterContainers;
  return outerTypes.hasOwnProperty(getKind(type)) ?
    stripOuterType(type.meta.type, outerTypes) :
    type;
}

// returns `value` if it's not `Nil`, otherwise `defaultValue`
function getOrElse(value, defaultValue) {
  return Nil.is(value) ? defaultValue : value;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function getChoices(map, order, emptyChoice) {
  var choices = Object.keys(map).map(function (value, i) {
    return {value: value, text: map[value]};
  });
  // apply an order (asc, desc) to options
  choices.sort(Order.meta.map[order || 'asc']);
  if (emptyChoice) {
    // add an empty choice as the first choice
    choices.unshift(emptyChoice);
  }
  return choices;
}

//
// jsx utils
//

function getOptionalLabel(name, optional) {
  name = humanize(name);
  return optional ?
    <span>{name}<small className="text-muted">{optional}</small></span> :
    <span>{name}</span>;
}

function getLabel(label, breakpoints) {
  var classes = {};
  if (breakpoints) {
    classes['control-label'] = true;
    classes[breakpoints.toLabelClassName()] = true;
  }
  return label ? <label className={cx(classes)}>{label}</label> : null;
}

function getHelp(help, classes) {
  classes = classes || {};
  classes['help-block'] = true;
  return help ? <span className={cx(classes)}>{help}</span> : null;
}

function getError(error, hasError) {
  // add 'error-block' style class to allow display customization
  return hasError ? getHelp(error, {'error-block': true}) : null;
}

function getAddon(addon) {
  return addon ? <span className="input-group-addon">{addon}</span> : null;
}

var Positive = subtype(Num, function (n) {
  return n % 1 === 0 && n >= 0;
}, 'Positive');

var Cols = subtype(tuple([Positive, Positive]), function (cols) {
  return cols[0] + cols[1] === 12;
}, 'Cols');

var Breakpoints = struct({
  xs: maybe(Cols),
  sm: maybe(Cols),
  md: maybe(Cols),
  lg: maybe(Cols)
}, 'Breakpoints');

var Size = enums.of('xs sm md lg', 'Size');

function toClassName(n) {
  return function () {
    var classes = {};
    for (var size in this) {
      var value = this[size];
      if (this.hasOwnProperty(size) && !Nil.is(value)) {
        classes['col-' + size + '-' + value[n]] = true;
      }
    }
    return cx(classes);
  };
}

Breakpoints.prototype.toLabelClassName = toClassName(0);
Breakpoints.prototype.toInputClassName = toClassName(1);
Breakpoints.prototype.toCheckboxClassName = function () {
  var classes = {};
  for (var size in this) {
    var value = this[size];
    if (this.hasOwnProperty(size) && !Nil.is(value)) {
      classes['col-' + size + '-offset-' + value[0]] = true;
      classes['col-' + size + '-' + value[1]] = true;
    }
  }
  return cx(classes);
};

function getOption(option, key) {
  return <option key={key} value={option.value}>{option.text}</option>;
}

// returns the list of options of a select
function getOptions(options, order, emptyOption) {
  if (Func.is(options)) {
    // options is an Enum
    return getChoices(options.meta.map, order, emptyOption).map(getOption);  
  }
  var ret = [];
  if (emptyOption) {
    ret.push(getOption(emptyOption, -1));
  }
  options.forEach(function (x, i) {
    if (x.group) {
      ret.push(
        <optgroup label={x.group} key={i}>
          {x.options.map(function (o, j) {
            return getOption(o, String(i) + '-' + String(j));
          })}
        </optgroup>
      );
    } else {
      ret.push(getOption(x, i));
    }
  });
  return ret;
}

//
// array utils
//

function remove(arr, index) {
  var ret = arr.slice();
  ret.splice(index, 1);
  return ret;
}

function move(arr, from, to) {
  var ret = arr.slice();
  if (from === to) {
    return ret;
  }
  var element = ret.splice(from, 1)[0];
  ret.splice(to, 0, element);
  return ret;
}

function moveUp(arr, i) {
  return move(arr, i, i - 1);
}

function moveDown(arr, i) {
  return move(arr, i, i + 1);
}

//
// default React class methods
//

function getInitialState(hasError) {
  return function () {
    return { hasError: getOrElse(hasError, false) };
  };
}

function getValue(type, rawValue) {
  return function () {
    var value = rawValue || this.getRawValue();
    var result = t.validate(value, type);
    var isValid = result.isValid();
    this.setState({hasError: !isValid});
    return isValid ? type(value) : result;
  };
}

// ========================
// type -> input conversion
// ========================

function getInput(type) {
  type = stripOuterType(type);
  var kind = getKind(type);
  var ret = options.inputs[kind];
  if (Func.is(ret)) {
    return ret;
  }
  ret = ret[getName(type)];
  if (Func.is(ret)) {
    return ret;
  }
  return textbox;
}

// common options
var CommonOpts = struct({
  ctx:          Any,
  value:        Any,
  name:         maybe(Str),
  label:        Any,
  help:         Any,
  message:      maybe(Str),
  hasError:     maybe(Bool),
  onChange:     maybe(Func)
});

//
// textbox
//

// attr `type` of input tag
var TypeAttr = enums.of('hidden text textarea password color date datetime datetime-local email month number range search tel time url week', 'TypeAttr');

var TextboxOpts = CommonOpts.extend([{
  type:         maybe(TypeAttr),
  groupClasses: maybe(Obj),
  placeholder:  maybe(Str),
  i17n:         maybe(I17n),
  disabled:     maybe(Bool),
  readOnly:     maybe(Bool),
  addonBefore:  Any,
  addonAfter:   Any,
  breakpoints:  maybe(Breakpoints),
  height:       maybe(Size)
}], 'TextboxOpts');

function textbox(type, opts) {

  assert(Type.is(type));

  opts = new TextboxOpts(opts || {});
  var innerType = stripOuterType(type);
  var typeAttr = opts.type || 'text';
  var i17n = opts.i17n || defaultI17n;
  var defaultValue = i17n.format(getOrElse(opts.value, null), innerType);
  var label = getLabel(opts.label, opts.breakpoints);
  var help = getHelp(opts.help);
  var addonBefore = getAddon(opts.addonBefore);
  var addonAfter = getAddon(opts.addonAfter);

  var inputClasses = {
    'form-control': true
  };
  if (opts.height) {
    inputClasses['input-' + opts.height] = true;
  }

  return React.createClass({
    
    displayName: 'Textbox',
    
    getInitialState: getInitialState(opts.hasError),
    
    getRawValue: function () {
      var value = this.refs.input.getDOMNode().value.trim() || null;
      value = i17n.parse(value, innerType);
      return value;
    },
    
    getValue: getValue(type),

    render: function () {

      var error = getError(opts.message, this.state.hasError);

      var groupClasses = mixin({
        'form-group': true,
        'has-error': this.state.hasError
      }, opts.groupClasses);

      var tag = 'textarea';
      var props = {
        ref: 'input',
        name: opts.name,
        className: cx(inputClasses),
        defaultValue: defaultValue,
        disabled: opts.disabled,
        readOnly: opts.readOnly,
        placeholder: opts.placeholder,
        onChange: opts.onChange
      };
      if (typeAttr !== 'textarea') {
        tag = 'input';
        props.type = typeAttr;
      }

      var input = React.DOM[tag](props);

      if (addonBefore || addonAfter) {
        input = (
          <div className="input-group">
            {addonBefore}
            {input}
            {addonAfter}
          </div>
        );
      }

      if (opts.breakpoints) {
        input = (
          <div className={opts.breakpoints.toInputClassName()}>
            {input}
          </div>
        );
      }

      return (
        <div className={cx(groupClasses)}>
          {label}
          {input}
          {error}
          {help}
        </div>
      );
    }

  });

}

//
// select
//

var SelectOpts = CommonOpts.extend([{
  options:      Any,
  groupClasses: maybe(Obj),
  emptyOption:  maybe(Option),
  order:        maybe(Order),
  disabled:     maybe(Bool),
  breakpoints:  maybe(Breakpoints),
  height:       maybe(Size),
  multiple:     maybe(Bool)
}], 'SelectOpts');

var selectOuterTypes = {maybe: 1, subtype: 1, list: 1};

function select(type, opts) {

  assert(Type.is(type));

  opts = new SelectOpts(opts || {});

  var Enum = stripOuterType(type, selectOuterTypes);
  var isMultiple = opts.multiple === true;
  var emptyOption = isMultiple ? null : opts.emptyOption;
  var emptyValue = emptyOption ? emptyOption.value : null;
  var defaultValue = getOrElse(opts.value, emptyValue);
  var label = getLabel(opts.label, opts.breakpoints);
  var help = getHelp(opts.help);
  var options = getOptions(opts.options || Enum, opts.order, emptyOption);

  var inputClasses = {
    'form-control': true
  };
  if (opts.height) {
    inputClasses['input-' + opts.height] = true;
  }

  return React.createClass({
    
    displayName: 'Select',
    
    getInitialState: getInitialState(opts.hasError),
    
    getRawValue: function () {
      var select = this.refs.input.getDOMNode();
      if (isMultiple) {
        var values = [];
        for (var i = 0, len = select.options.length ; i < len ; i++ ) {
            var option = select.options[i];
            if (option.selected) {
              values.push(option.value);
            }
        }
        return values;
      }
      return select.value === emptyValue ? null : select.value;
    },
    
    getValue: getValue(type),

    render: function () {

      var error = getError(opts.message, this.state.hasError);

      var groupClasses = mixin({
        'form-group': true,
        'has-error': this.state.hasError
      }, opts.groupClasses);

      var input = (
        <select 
          ref="input"
          name={opts.name}
          className={cx(inputClasses)} 
          disabled={opts.disabled}
          readOnly={opts.readOnly}
          defaultValue={defaultValue}
          multiple={isMultiple}>
          {options}
        </select>
      );

      if (opts.breakpoints) {
        input = (
          <div className={opts.breakpoints.toInputClassName()}>
            {input}
          </div>
        );
      }

      return (
        <div className={cx(groupClasses)}>
          {label}
          {input}
          {error}
          {help}
        </div>
      );
    }

  });

}

//
// radio
//

var RadioOpts = CommonOpts.extend([{
  groupClasses: maybe(Obj),
  order:        maybe(Order),
  breakpoints:  maybe(Breakpoints)
}], 'RadioOpts');

function radio(type, opts) {

  assert(Type.is(type));

  opts = new RadioOpts(opts || {});

  var Enum = stripOuterType(type);
  var defaultValue = getOrElse(opts.value, null);
  var label = getLabel(opts.label, opts.breakpoints);
  var help = getHelp(opts.help);
  var choices = getChoices(Enum.meta.map, opts.order);
  var len = choices.length;
  var name = opts.name || uuid();

  return React.createClass({
    
    displayName: 'Radio',
    
    getInitialState: getInitialState(opts.hasError),
    
    getRawValue: function () {
      var value = null;
      for (var i = 0 ; i < len ; i++ ) {
        var node = this.refs[name + i].getDOMNode();
        if (node.checked) {
          value = node.value;
          break;
        }
      }
      return value;
    },
    
    getValue: getValue(type),

    render: function () {

      var error = getError(opts.message, this.state.hasError);

      var groupClasses = mixin({
        'form-group': true,
        'has-error': this.state.hasError
      }, opts.groupClasses);

      var input = choices.map(function (c, i) {
        return (
          <div className="radio" key={i}>
            <label>
              <input type="radio" ref={name + i} name={name} value={c.value} defaultChecked={c.value === defaultValue}></input>
              {c.text}
            </label>
          </div>
        );
      });

      if (opts.breakpoints) {
        input = (
          <div className={opts.breakpoints.toInputClassName()}>
            {input}
          </div>
        );
      }

      return (
        <div className={cx(groupClasses)}>
          {label}
          {input}
          {error}
          {help}
        </div>
      );
    }

  });

}

//
// checkbox
//

var CheckboxOpts = CommonOpts.extend([{
  groupClasses: maybe(Obj),
  breakpoints:  maybe(Breakpoints),
}], 'CheckboxOpts');

function checkbox(type, opts) {

  assert(Type.is(type));

  opts = new CheckboxOpts(opts || {});

  var defaultValue = getOrElse(opts.value, false);
  var help = getHelp(opts.help);

  return React.createClass({
    
    displayName: 'Checkbox',
    
    getInitialState: getInitialState(opts.hasError),
    
    getRawValue: function () {
      return this.refs.input.getDOMNode().checked;
    },
    
    getValue: getValue(type),

    render: function () {

      var error = getError(opts.message, this.state.hasError);

      var groupClasses = mixin({
        'form-group': true,
        'has-error': this.state.hasError
      }, opts.groupClasses);

      var input = (
        <div className="checkbox">
          <label>
            <input ref="input" type="checkbox" name={opts.name} defaultChecked={defaultValue}/> {opts.label}
          </label>
        </div>
      );

      if (opts.breakpoints) {
        input = (
          <div className={opts.breakpoints.toCheckboxClassName()}>
            {input}
          </div>
        );
      }

      return (
        <div className={cx(groupClasses)}>
          {input}
          {error}
          {help}
        </div>
      );
    }

  });

}

//
// forms
//

var FormAuto = enums.of('none placeholders labels', 'FormAuto');

var FormOpts = struct({
  ctx:          Any,
  value:        maybe(Obj),
  label:        Any,
  auto:         maybe(FormAuto),
  order:        maybe(list(Str)),
  fields:       maybe(Obj),
  breakpoints:  maybe(Breakpoints),
  i17n:         maybe(I17n),
  i18n:         maybe(I18n)
}, 'FormOpts');

function createForm(type, opts) {

  assert(Type.is(type));

  opts = new FormOpts(opts || {});

  var Struct = stripOuterType(type);
  var props = Struct.meta.props;
  var keys = Object.keys(props);
  var order = opts.order || keys;
  var len = order.length;
  assert(keys.length === len, 'Invalid `order` of value `%j` supplied to `createForm`, all type props must be specified', order);
  var fields = opts.fields || {};
  var defaultValue = opts.value || {};
  var label = getLabel(opts.label);
  var i18n = opts.i18n ? new I18n(opts.i18n) : defaultI18n;

  var auto = opts.auto || 'placeholders';
  var factories = order.map(function (name) {
    var type = props[name];

    // copy opts to preserve the original
    var o = mixin({
      ctx: opts.ctx,
      value: defaultValue[name],
      breakpoints: opts.breakpoints,
      i17n: opts.i17n,
      i18n: opts.i18n
    }, fields[name], true);

    // get the input from the type
    var Input = o.input ? o.input : getInput(type);

    // handle optional fields auto label
    var optional = getKind(type) === 'maybe' ? i18n.optional : '';

    // lists, forms, checkboxes and radios must always have a label
    if (Input === createList || Input === createForm || Input === checkbox || Input === radio) {
      o.label = o.label || getOptionalLabel(name, optional);
    }

    if (Input === createForm) {
      o.auto = auto;
    } else {

      if (auto === 'labels') {
        o.label = o.label || getOptionalLabel(name, optional);
        if (Input === select) {
          o.emptyOption = o.emptyOption || {value: '', text: '-'};
        }
      } else if (auto === 'placeholders' && !o.label) {
        if (Input === select) {
          o.emptyOption = o.emptyOption || {value: '', text: humanize(i18n.select + name + optional)};
        } else if (Input === textbox) {
          o.placeholder = o.placeholder || humanize(name + optional);
        }
      }

    }

    return Input(type, o);
  });

  return React.createClass({

    displayName: 'Form',

    getInitialState: getInitialState(opts.hasError),

    getValue: function (depth) {

      depth = depth || 0;

      var errors = [];
      var value = {};
      var result;
      
      for ( var i = 0 ; i < len ; i++ ) {
        var name = order[i];
        var result = this.refs[name].getValue(depth + 1);
        if (Result.is(result)) {
          errors = errors.concat(result.errors);
        } else {
          value[name] = result;
        }
      }
      if (errors.length) {
        return depth ? new Result({errors: errors}) : null;
      }

      result = t.validate(new Struct(value), type);
      var isValid = result.isValid();
      this.setState({hasError: !isValid});
      return isValid ? type(value) : depth ? result : null;
    },

    render: function () {

      var classes = {
        //'form-group': true,
        'has-error': this.state.hasError
      };

      var children = order.map(function (name, i) {
        return factories[i]({key: i, ref: name});
      });

      return (
        <fieldset className={cx(classes)}>
          {label}
          {children}
        </fieldset>
      );
    }

  });

}

//
// lists
//

var ListOpts = struct({
  ctx:            Any,
  value:          maybe(Arr),
  label:          Any,
  disableAdd:     maybe(Bool),
  disableRemove:  maybe(Bool),
  disableOrder:   maybe(Bool),
  item:           maybe(Obj),
  i17n:           maybe(I17n),
  i18n:           maybe(I18n)
}, 'ListOpts');

function createList(type, opts) {

  assert(Type.is(type));

  opts = new ListOpts(opts || {});

  var List = type;
  var ItemType = stripOuterType(List.meta.type);
  var Input = opts.input || getInput(ItemType);
  var defaultValue = getOrElse(opts.value, []);
  var label = getLabel(opts.label);
  var i18n = opts.i18n ? new I18n(opts.i18n) : defaultI18n;

  return React.createClass({

    displayName: 'List',

    getInitialState: function () {
      return { 
        hasError: getOrElse(opts.hasError, false), 
        value: defaultValue 
      };
    },

    getValue: function (depth) {

      depth = depth || 0;

      var errors = [];
      var value = [];
      var result;
      
      for ( var i = 0, len = this.state.value.length ; i < len ; i++ ) {
        var result = this.refs[i].getValue(depth + 1);
        if (Result.is(result)) {
          errors = errors.concat(result.errors);
        } else {
          value.push(result);
        }
      }
      if (errors.length) {
        return depth ? new Result({errors: errors}) : null;
      }

      result = t.validate(value, type);
      var isValid = result.isValid();
      this.setState({hasError: !isValid, value: value});
      return isValid ? type(value) : depth ? result : null;
    },

    add: function (evt) {
      evt.preventDefault();
      var value = this.getValue();
      if (value) {
        value = value.concat(null);
        this.setState({hasError: this.state.hasError, value: value});
      }
    },

    remove: function (i, evt) {
      evt.preventDefault();
      var value = this.getValue();
      if (value) {
        value = remove(value, i);
      } else {
        value = remove(this.state.value, i);
      }
      this.setState({hasError: this.state.hasError, value: value});
    },

    moveUp: function (i, evt) {
      evt.preventDefault();
      var value = this.getValue();
      if (i > 0 && value) {
        value = moveUp(value, i);
        this.setState({hasError: this.state.hasError, value: value});
      }
    },

    moveDown: function (i, evt) {
      evt.preventDefault();
      var value = this.getValue();
      if (i < this.state.value.length - 1 && value) {
        value = moveDown(value, i);
        this.setState({hasError: this.state.hasError, value: value});
      }
    },

    render: function () {

      var classes = {
        'form-group': true,
        'has-error': this.state.hasError
      };

      var children = [];
      for ( var i = 0, len = this.state.value.length ; i < len ; i++ ) {
        
        // copy opts to preserve the original
        var o = mixin({
          ctx: opts.ctx,
          value: this.state.value[i],
          i17n: opts.i17n,
          i18n: opts.i18n
        }, opts.item, true);
        
        children.push(
          <div className="row" key={i}>
            <div className="col-md-7">
              {Input(ItemType, o)({ref: i})}
            </div>
            <div className="col-md-5">
              <div className="btn-group">
                {opts.disableRemove ? null : <button className="btn btn-default btn-remove" onClick={this.remove.bind(this, i)}>{i18n.remove}</button>}
                {!opts.disableOrder ? <button className="btn btn-default btn-move-up" onClick={this.moveUp.bind(this, i)}>{i18n.up}</button> : null}
                {!opts.disableOrder ? <button className="btn btn-default btn-move-down" onClick={this.moveDown.bind(this, i)}>{i18n.down}</button> : null}
              </div>
            </div>
          </div>
        );
      }

      var btnAdd = opts.disableAdd ? null : (
        <div className="form-group">
          <button className="btn btn-default btn-add" onClick={this.add}>{i18n.add}</button>
        </div>
      );

      return (
        <fieldset className={cx(classes)}>
          {label}
          {children}
          {btnAdd}
        </fieldset>
      );
    }

  });

}

function create(type, opts) {
  return getKind(stripOuterType(type)) === 'struct' ? 
    createForm(type, opts) : 
    createList(type, opts);
}

// ===============================
// options: here you can customize
// ===============================

var options = {
  inputs: {
    irriducible: {
      Bool: checkbox
    },
    enums: select,
    struct: createForm,
    list: createList
  }
};

//
// exports
//

t.form = {
  options: options,
  util: {
    humanize: humanize,
    Option: Option,
    Breakpoints: Breakpoints
  },
  I17n: I17n,
  I18n: I18n,
  textbox: textbox,
  select: select,
  radio: radio,
  checkbox: checkbox,
  createForm: createForm,
  createList: createList,
  create: create
};

module.exports = t;

