
def merge(xs, l, m, r):
  n1 = m - l + 1
  n2 = r - m

  L = [0] * n1
  R = [0] * n2

  for i in range(0, n1):
    L[i] = xs[l+i]
  for j in range(0, n2):
    R[j] = xs[m+ 1 +j]

  i = 0 
  j = 0 
  k = l
  while (i < n1 and j < n2):
    if (L[i] <= R[j]):
      xs[k] = L[i]
      i = i + 1
    else:
      xs[k] = R[j]
      j = j + 1
    k = k + 1

  while (i < n1):
    xs[k] = L[i]
    i = i + 1
    k = k + 1

  while (j < n2):
    xs[k] = R[j]
    j = j + 1
    k = k + 1 

def mergesort(xs, l, r):
    if (l < r):
        m = l + (r - l) // 2 
        mergesort(xs, l, m)
        mergesort(xs, m+1, r)

        merge(xs, l, m, r)

def sort(xs):
  mergesort(xs, 0, len(xs) - 1)


