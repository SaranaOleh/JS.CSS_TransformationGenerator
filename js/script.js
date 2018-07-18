function GenerateTransform(active, name, value) {
    this.active = active;
    this.name = name;
    this.value = value;
}
GenerateTransform.prototype.toString = function () {
    if(this.active){
        return this.name + "("+this.value+")";
    } else {
        return this.name + (this.name === "scale" ? "(1)" : "(0)");
    }
};
GenerateTransform.prototype.toCssString = function () {
    return this.name + "(" + this.value + ")";
};
GenerateTransform.prototype.equalTo = function (data) {
    return this.name === data.name;
};
function GenerateSize(width,height) {
    this.width = width;
    this.height = height;
}
var TransformGenerator = {
    init: function () {
        this.control.init();
        this.preview.init();
    }
};
TransformGenerator.preview = {
    init: function () {
        var self = this;
        this.container = document.querySelector(".preview");
        this.block = this.container.querySelector(".block");
        this.resultTransform = this.container.parentElement.querySelector(".resultTransform");
        this.resultSize = this.container.parentElement.querySelector(".resultSize");
        TransformGenerator.control.transformsStream.subscribe(function (data) {
            self.setTransform(data);
            self.setCssTransform(data);
        });
        TransformGenerator.control.sizeStream.subscribe(function (data) {
            self.setSize(data);
            self.setCssSize(data);
        });
    },
    setSize: function (data) {
        this.block.style.width = data.width + "px";
        this.block.style.height = data.height + "px";
    },
    setTransform: function (data) {
        this.value = data.map(function (prop) {
            return prop.toString()
        }).join(" ");
        this.block.style.transform = this.value;
    },
    setCssTransform: function (data) {
        var value = data.map(function (prop) {
            return prop.toCssString()
        }).join(" ");
        var cssValue = "transform: " + value + ";";
        if(value.length > 0){
            this.resultTransform.innerHTML = cssValue;
        } else {
            this.resultTransform.innerHTML = "";
        }
    },
    setCssSize: function (data) {
        var sizeObj = Object.keys(data);
        this.resultSize.innerHTML = sizeObj[0] + ": " + data.width + "px; " + sizeObj[1] + ": " + data.height + "px; "
    }
};
TransformGenerator.control = {
    transforms: [],
    init: function () {
        this.container = document.querySelector(".control");
        this.widthInput = this.container.querySelector("#width");
        this.heightInput = this.container.querySelector("#height");
        this.createStreams();
    },
    createStreams: function () {
        var self = this;
        var rangeInputStream = Rx.Observable.fromEvent(this.container,"input").filter(function (e) {
            return e.target.dataset.type === "value";
        }).map(function (e) {
            return self.createTransform(e.target,e.target.previousElementSibling);
        });
        var checkInputStream = Rx.Observable.fromEvent(this.container,"change").filter(function (e) {
            return e.target.dataset.type === "active";
        }).map(function (e) {
            return self.createTransform(e.target.nextElementSibling,e.target);
        });
        var fusedStream = Rx.Observable.merge(rangeInputStream,checkInputStream);
        this.transformsStream = Rx.Observable.create(function (observer) {
             self.transformsStreamObserver = observer;
        });
        this.sizeStream = Rx.Observable.merge(
            Rx.Observable.fromEvent(this.widthInput,"change"),
            Rx.Observable.fromEvent(this.heightInput,"change")
        ).map(function () {
            return new GenerateSize(self.widthInput.value,self.heightInput.value);
        });
        fusedStream.subscribe(function (data) {
            self.changeTransform(data);
        });
    },
    createTransform: function (range,checkbox) {
        return new GenerateTransform(
            checkbox.checked,
            range.dataset.transform,
            range.value + range.dataset.units
        );
    },
    changeTransform: function (data) {
        var exist = this.transforms.some(function (elem) {
            return elem.equalTo(data);
        });
        if(exist){
            this.transforms = this.transforms.map(function (elem) {
                return elem.equalTo(data) ? data : elem;
            });
        } else {
            this.transforms.push(data);
        }
        this.transforms = this.transforms.filter(function (elem) {
            return elem.active === true;
        });
        this.transformsStreamObserver.next(this.transforms);
    }
};
TransformGenerator.init();