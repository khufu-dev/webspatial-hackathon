;; Double precision Kepler solver and orbital-frame rotation.
;; All angles are radians, distances are AU. Output: ecliptic XYZ at byte 0.
;; Only transcendental functions cross into JS; iteration, geometry, and
;; rotations execute in WebAssembly. No clock or rendering dependencies.
(module
  (import "math" "sin" (func $sin (param f64) (result f64)))
  (import "math" "cos" (func $cos (param f64) (result f64)))
  (memory (export "memory") 1)
  (func $eccentric (export "eccentric") (param $m f64) (param $e f64) (result f64)
    (local $E f64) (local $delta f64) (local $n i32)
    (local.set $E (f64.add (local.get $m) (f64.mul (local.get $e) (call $sin (local.get $m)))))
    (block $done
      (loop $solve
        (local.set $delta
          (f64.div
            (f64.sub (f64.sub (local.get $E) (f64.mul (local.get $e) (call $sin (local.get $E)))) (local.get $m))
            (f64.sub (f64.const 1) (f64.mul (local.get $e) (call $cos (local.get $E))))))
        (local.set $E (f64.sub (local.get $E) (local.get $delta)))
        (local.set $n (i32.add (local.get $n) (i32.const 1)))
        (br_if $done (f64.lt (f64.abs (local.get $delta)) (f64.const 1e-13)))
        (br_if $solve (i32.lt_u (local.get $n) (i32.const 24)))))
    (local.get $E))
  (func (export "position")
    (param $a f64) (param $e f64) (param $m f64)
    (param $i f64) (param $node f64) (param $peri f64)
    (local $E f64) (local $x f64) (local $y f64)
    (local $u f64) (local $v f64)
    (local.set $E (call $eccentric (local.get $m) (local.get $e)))
    (local.set $x (f64.mul (local.get $a) (f64.sub (call $cos (local.get $E)) (local.get $e))))
    (local.set $y (f64.mul (f64.mul (local.get $a)
      (f64.sqrt (f64.sub (f64.const 1) (f64.mul (local.get $e) (local.get $e)))))
      (call $sin (local.get $E))))
    ;; Rotate by argument of perihelion in the orbital plane.
    (local.set $u (f64.sub
      (f64.mul (local.get $x) (call $cos (local.get $peri)))
      (f64.mul (local.get $y) (call $sin (local.get $peri)))))
    (local.set $v (f64.add
      (f64.mul (local.get $x) (call $sin (local.get $peri)))
      (f64.mul (local.get $y) (call $cos (local.get $peri)))))
    ;; Incline the plane and rotate by the longitude of the ascending node.
    (f64.store (i32.const 0) (f64.sub
      (f64.mul (local.get $u) (call $cos (local.get $node)))
      (f64.mul (f64.mul (local.get $v) (call $cos (local.get $i))) (call $sin (local.get $node)))))
    (f64.store (i32.const 8) (f64.add
      (f64.mul (local.get $u) (call $sin (local.get $node)))
      (f64.mul (f64.mul (local.get $v) (call $cos (local.get $i))) (call $cos (local.get $node)))))
    (f64.store (i32.const 16) (f64.mul (local.get $v) (call $sin (local.get $i))))))
